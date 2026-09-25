import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BillingPeriod } from '@/lib/pricing';

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada.');
  return (client ??= new Stripe(key));
}

export function priceIdFor(period: BillingPeriod, plan: 'founder' | 'standard'): string {
  const id = period === 'annual' ? process.env.STRIPE_PRICE_ANNUAL : plan === 'founder' ? process.env.STRIPE_PRICE_FOUNDER : process.env.STRIPE_PRICE_MONTHLY;
  if (!id) throw new Error('Preço do Stripe não configurado (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_FOUNDER / STRIPE_PRICE_ANNUAL).');
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
  };
  if (sub.metadata.plan === 'founder') update.price_plan = 'founder';

  const { error } = await createAdminClient().from('subscriptions').update(update).eq('band_id', bandId);
  if (error) throw error;
}
