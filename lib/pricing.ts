import type { BandKind } from '@/lib/plans';

/** The first bands to pay lock in the founder price forever (only on the person's main Banda). */
export const FOUNDER_LIMIT = 50;

export type BillingPeriod = 'monthly' | 'annual';

/**
 * `principal`: the most expensive plan a person pays for, at full price.
 * `adesao`: every other account they pay for (a second Banda, or a Freela next to a Banda), cheaper.
 * The plan that costs the most is always the principal one (see lib/billing).
 */
export type PriceTier = 'principal' | 'adesao';

/** Display prices in BRL. The amounts actually charged live in the Stripe prices (STRIPE_PRICE_* env vars, lib/stripe). */
export const PRICE_TABLE = {
  banda: { principal: { monthly: 49.9, annual: 499 }, adesao: { monthly: 29.9, annual: 299 } },
  freela: { principal: { monthly: 14.9, annual: 149 }, adesao: { monthly: 9.9, annual: 99 } },
} as const;

/** The founder price: a Banda that is someone's principal plan, monthly billing, while the 50 slots last. */
export const FOUNDER_MONTHLY = 24.9;

/** Kept for the screens that only talk about the Banda plan (admin MRR, landing). */
export const PRICES = { standard: PRICE_TABLE.banda.principal.monthly, founder: FOUNDER_MONTHLY, annual: PRICE_TABLE.banda.principal.annual } as const;

export function priceOf(kind: BandKind, tier: PriceTier, period: BillingPeriod, founder = false): number {
  if (founder && kind === 'banda' && tier === 'principal' && period === 'monthly') return FOUNDER_MONTHLY;
  return PRICE_TABLE[kind][tier][period];
}

/** Monthly plan a band gets when it subscribes now: founder while slots remain (or if it already is one). */
export function monthlyPlan(isFounder: boolean, founders: number): 'founder' | 'standard' {
  return isFounder || founders < FOUNDER_LIMIT ? 'founder' : 'standard';
}
