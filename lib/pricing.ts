/** The first bands to pay lock in the founder price forever. */
export const FOUNDER_LIMIT = 50;

/** Display prices in BRL. The amounts actually charged live in the Stripe prices (STRIPE_PRICE_* env vars). */
export const PRICES = { standard: 49.9, founder: 24.9, annual: 499 } as const;

export type BillingPeriod = 'monthly' | 'annual';

/** Monthly plan a band gets when it subscribes now: founder while slots remain (or if it already is one). */
export function monthlyPlan(isFounder: boolean, founders: number): 'founder' | 'standard' {
  return isFounder || founders < FOUNDER_LIMIT ? 'founder' : 'standard';
}
