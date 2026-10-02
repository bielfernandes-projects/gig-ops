import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BillingPeriod, PriceTier } from '@/lib/pricing';
import type { BandKind } from '@/lib/plans';

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada.');
  return (client ??= new Stripe(key));
}

/** Env var that holds the Stripe price id for each plan (see DOCUMENTATION.md, "Planos e preços"). */
const PRICE_ENV: Record<string, string> = {
  'banda.principal.monthly': 'STRIPE_PRICE_MONTHLY',
  'banda.principal.annual': 'STRIPE_PRICE_ANNUAL',
  'banda.principal.founder': 'STRIPE_PRICE_FOUNDER',
  'banda.adesao.monthly': 'STRIPE_PRICE_ADESAO_BANDA',
  'banda.adesao.annual': 'STRIPE_PRICE_ADESAO_BANDA_ANNUAL',
  'freela.principal.monthly': 'STRIPE_PRICE_FREELA',
  'freela.principal.annual': 'STRIPE_PRICE_FREELA_ANNUAL',
  'freela.adesao.monthly': 'STRIPE_PRICE_ADESAO_FREELA',
  'freela.adesao.annual': 'STRIPE_PRICE_ADESAO_FREELA_ANNUAL',
};

export function priceIdFor(kind: BandKind, tier: PriceTier, period: BillingPeriod, founder = false): string {
  const slot = founder && kind === 'banda' && tier === 'principal' && period === 'monthly' ? 'founder' : period;
  const name = PRICE_ENV[`${kind}.${tier}.${slot}`];
  const id = process.env[name];
  if (!id) throw new Error(`Preço do Stripe não configurado (${name}).`);
  return id;
}

/**
 * Mirrors a Stripe subscription into `subscriptions`. Always called with a freshly retrieved
 * subscription, so redelivered or out-of-order events converge on the same state.
 * A canceled-at-period-end subscription stays 'active' until paid_until passes (see subscriptionState).
 */
export async function syncSubscription(sub: Stripe.Subscription) {
  const bandId = sub.metadata.band_id;
  if (!bandId) return;

  const item = sub.items.data[0];
  const live = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
  const update: Record<string, unknown> = {
    status: live ? 'active' : 'expired',
    paid_until: new Date(item.current_period_end * 1000).toISOString(),
    billing_period: item.price.recurring?.interval === 'year' ? 'annual' : 'monthly',
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    price_tier: sub.metadata.tier === 'adesao' ? 'adesao' : 'principal',
  };
  if (sub.metadata.plan === 'founder') update.price_plan = 'founder';

  const { error } = await createAdminClient().from('subscriptions').update(update).eq('band_id', bandId);
  if (error) throw error;
}
