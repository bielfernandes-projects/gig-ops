import type { BandKind } from '@/lib/plans';
import type { PriceTier } from '@/lib/pricing';

/** One account of a person, as far as pricing is concerned. Pure: the database reads live in lib/billing. */
export type Account = { kind: BandKind; founder: boolean; createdAt: string };

/** Principal first: Banda before Freela, then the founder, then the oldest. */
export const rank = (a: Account, b: Account) =>
  Number(b.kind === 'banda') - Number(a.kind === 'banda') || Number(b.founder) - Number(a.founder) || a.createdAt.localeCompare(b.createdAt);

/**
 * What `self` pays next to the accounts the person already pays for (`others`): principal at full
 * price unless one of them outranks it, then adesão. The founder price only goes to a principal
 * Banda, and only once per person.
 */
export function decideTier(others: Account[], self: Account): { tier: PriceTier; founder: boolean } {
  const [first] = [...others, self].sort(rank);
  const principal = first === self;
  return { tier: principal ? 'principal' : 'adesao', founder: principal && self.kind === 'banda' && !others.some((o) => o.founder) };
}
