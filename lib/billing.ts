import { createAdminClient } from '@/lib/supabase/admin';
import { countFounders } from '@/lib/founders';
import { FOUNDER_LIMIT, priceOf, type BillingPeriod, type PriceTier } from '@/lib/pricing';
import { priceIdFor, stripe } from '@/lib/stripe';
import type { BandKind } from '@/lib/plans';
import { decideTier, rank } from '@/lib/billing-rules';

/**
 * Who pays what. A person can own several accounts (a Banda, a Freela, another Banda...). The one
 * that costs the most is their *principal* plan, at full price; every other paid account is an
 * *adesão*, cheaper. Server-only (service role).
 */

type Owned = {
  bandId: string;
  kind: BandKind;
  createdAt: string;
  founder: boolean;
  /** A live Stripe subscription backs this account. Only these count when deciding who is principal. */
  paying: boolean;
  stripeSubscriptionId: string | null;
  period: BillingPeriod;
};

export async function ownedAccounts(userId: string): Promise<Owned[]> {
  const admin = createAdminClient();
  const { data: rows } = (await admin.from('band_members').select('band_id, bands(kind, created_at)').eq('user_id', userId).eq('role', 'owner')) as unknown as {
    data: { band_id: string; bands: { kind: BandKind; created_at: string } | { kind: BandKind; created_at: string }[] | null }[] | null;
  };
  const ids = (rows ?? []).map((r) => r.band_id);
  if (ids.length === 0) return [];
  const { data: subs } = (await admin
    .from('subscriptions')
    .select('band_id, status, price_plan, billing_period, stripe_subscription_id')
    .in('band_id', ids)) as unknown as { data: { band_id: string; status: string; price_plan: string; billing_period: BillingPeriod | null; stripe_subscription_id: string | null }[] | null };
  return (rows ?? []).map((r) => {
    const band = Array.isArray(r.bands) ? r.bands[0] : r.bands;
    const sub = subs?.find((s) => s.band_id === r.band_id);
    return {
      bandId: r.band_id,
      kind: band?.kind ?? 'banda',
      createdAt: band?.created_at ?? '',
      founder: sub?.price_plan === 'founder',
      paying: Boolean(sub?.stripe_subscription_id) && sub?.status === 'active',
      stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
      period: sub?.billing_period ?? 'monthly',
    };
  });
}

/** What an account costs if it were paid for now: principal unless another paying account outranks it. */
export async function tierFor(userId: string, bandId: string | null, kind: BandKind): Promise<{ tier: PriceTier; founder: boolean }> {
  const owned = await ownedAccounts(userId);
  const others = owned.filter((o) => o.paying && o.bandId !== bandId);
  return decideTier(others, { kind, founder: false, createdAt: owned.find((o) => o.bandId === bandId)?.createdAt ?? new Date().toISOString() });
}

/** Prices to show for an account (monthly and annual), plus whether the founder price applies. */
export async function quoteFor(userId: string, bandId: string | null, kind: BandKind, alreadyFounder = false) {
  const { tier, founder } = await tierFor(userId, bandId, kind);
  const slotsLeft = founder ? (await countFounders()) < FOUNDER_LIMIT : false;
  const isFounder = founder && (alreadyFounder || slotsLeft);
  return {
    tier,
    founder: isFounder,
    monthly: priceOf(kind, tier, 'monthly', isFounder),
    annual: priceOf(kind, tier, 'annual'),
  };
}

/**
 * Brings every paying account of a person to the price its place deserves. Runs after each Stripe
 * event: when the principal account is canceled the next most expensive one becomes principal (and
 * pays full price from the next renewal), and when a Banda is added to a Freela the Freela drops to
 * adesão. Changes take effect on the next invoice (no proration), and a repeat run is a no-op.
 */
export async function reconcilePricing(userId: string) {
  const paying = (await ownedAccounts(userId)).filter((o) => o.paying && o.stripeSubscriptionId).sort(rank);
  for (const [i, acc] of paying.entries()) {
    const tier: PriceTier = i === 0 ? 'principal' : 'adesao';
    const sub = await stripe().subscriptions.retrieve(acc.stripeSubscriptionId!);
    const item = sub.items.data[0];
    const period: BillingPeriod = item.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
    const wanted = priceIdFor(acc.kind, tier, period, acc.founder && tier === 'principal');
    if (item.price.id === wanted && sub.metadata.tier === tier) continue;
    await stripe().subscriptions.update(sub.id, { items: [{ id: item.id, price: wanted }], metadata: { ...sub.metadata, tier }, proration_behavior: 'none' });
  }
}
