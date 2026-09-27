/**
 * What a person sees of a Show, and whether its money is settled.
 *
 * These two questions used to be answered by inlined predicates on the Agenda (server), the
 * Dashboard (client) and the Show detail page — three copies that disagreed about which Shows are
 * in the past. They live here now so the answer is the same everywhere, and so the rules can be
 * asserted without rendering React.
 *
 * Client-safe: no server imports.
 */

import { startOfToday } from '@/lib/time';
import type { BandRoles } from '@/lib/band-view';

/** `go_lineup.status` when the Cachê has been paid. Anything else counts as pending. */
export const PAID = 'pago';

/** The columns of a Show these rules need. Any query that selects at least these fits. */
export type ScopedGig = {
  id: string;
  start_time: string;
  band_id?: string | null;
  bring_sound?: boolean;
  sound_cost?: number | null;
  is_sound_paid?: boolean;
};

/** The columns of an Escala row these rules need. */
export type ScopedLineup = {
  gig_id: string;
  member_id: string | null;
  fee_amount: number;
  status: string;
};

// ─── Who am I, on this Show? ────────────────────────────────────────────────

/** True when the viewer owns the Banda this Show belongs to. */
export const ownsGig = (roles: BandRoles, gig: ScopedGig) => !!gig.band_id && roles[gig.band_id]?.role === 'admin';

/** The viewer's `go_members.id` in the Banda this Show belongs to. */
export const myMemberIdFor = (roles: BandRoles, gig: ScopedGig) =>
  (gig.band_id ? roles[gig.band_id]?.memberId : null) ?? null;

/**
 * A given person's row among Escala rows already narrowed to one Show.
 *
 * `memberId` must be checked before comparing: an "avulso" (a guest typed straight into the Escala)
 * has `member_id === null`, so a plain `l.member_id === memberId` matches that guest for anyone who
 * has no roster row of their own — `null === null`. That would hand them a Show they are not on.
 */
export function lineupRowOf<L extends ScopedLineup>(lineups: L[], memberId: string | null): L | undefined {
  if (!memberId) return undefined;
  return lineups.find((l) => l.member_id === memberId);
}

/** Whether a given person is on an Escala already narrowed to one Show. */
export const isOnLineup = (lineups: ScopedLineup[], memberId: string | null) => !!lineupRowOf(lineups, memberId);

/** The viewer's own row in this Show's Escala, if they are on it. */
export function myLineup<L extends ScopedLineup>(roles: BandRoles, gig: ScopedGig, lineups: L[]): L | undefined {
  const myId = myMemberIdFor(roles, gig);
  if (!myId) return undefined;
  return lineups.find((l) => l.gig_id === gig.id && l.member_id === myId);
}

// ─── Time ───────────────────────────────────────────────────────────────────

/**
 * A Show is in the past once its day is over in Brazil — not the moment it starts. A Show playing
 * tonight is still upcoming, so it appears under "próximos cachês" and is never nagged about as an
 * unsettled payment while it is happening.
 */
export const isPast = (gig: ScopedGig, today: Date = startOfToday()) => new Date(gig.start_time) < today;

export const isUpcoming = (gig: ScopedGig, today: Date = startOfToday()) => !isPast(gig, today);

export const byStartTime = (a: ScopedGig, b: ScopedGig) =>
  new Date(a.start_time).getTime() - new Date(b.start_time).getTime();

// ─── Visibility ─────────────────────────────────────────────────────────────

/**
 * A Dono sees every Show of their Banda. A Membro sees only the Shows they are on the Escala of.
 * The decision is per Show, because the "Todas as bandas" view spans Bandas the person may own one
 * of and merely play in another.
 */
export function gigsVisibleTo<G extends ScopedGig>(roles: BandRoles, gigs: G[], lineups: ScopedLineup[]): G[] {
  return gigs.filter((gig) => ownsGig(roles, gig) || !!myLineup(roles, gig, lineups));
}

// ─── Settlement ─────────────────────────────────────────────────────────────

export type PaymentStatus =
  /** The viewer is a Membro and is not on this Show's Escala. */
  | 'not-scheduled'
  /** Somebody still has to be paid (for a Dono: any musician, or the sound). */
  | 'pending'
  /** Everything the viewer can see about this Show's money is paid. */
  | 'settled';

/** Whether the sound supplier is still owed for this Show. */
export const soundUnpaid = (gig: ScopedGig) =>
  !!gig.bring_sound && Number(gig.sound_cost ?? 0) > 0 && !gig.is_sound_paid;

/**
 * A Dono asks "have I paid everyone?"; a Membro asks "have I been paid?". One function, because
 * every screen that shows a Show has to make exactly this distinction.
 */
export function paymentStatus(roles: BandRoles, gig: ScopedGig, lineups: ScopedLineup[]): PaymentStatus {
  if (ownsGig(roles, gig)) {
    const crewUnpaid = lineups.some((l) => l.gig_id === gig.id && l.status !== PAID);
    return crewUnpaid || soundUnpaid(gig) ? 'pending' : 'settled';
  }
  const mine = myLineup(roles, gig, lineups);
  if (!mine) return 'not-scheduled';
  return mine.status === PAID ? 'settled' : 'pending';
}

/** Shows already played whose money is not settled yet — what both the Agenda and the Dashboard nag about. */
export function unsettledGigs<G extends ScopedGig>(
  roles: BandRoles,
  gigs: G[],
  lineups: ScopedLineup[],
  today: Date = startOfToday()
): G[] {
  return gigs.filter((gig) => isPast(gig, today) && paymentStatus(roles, gig, lineups) === 'pending');
}

// ─── Money the viewer is allowed to see ─────────────────────────────────────

/** The viewer's own Cachê on this Show. Zero when they are not on the Escala. */
export const myFee = (roles: BandRoles, gig: ScopedGig, lineups: ScopedLineup[]) =>
  Number(myLineup(roles, gig, lineups)?.fee_amount ?? 0);

/** The viewer's own Cachê on this Show, if it has not been paid to them yet. */
export function myUnpaidFee(roles: BandRoles, gig: ScopedGig, lineups: ScopedLineup[]): number {
  const mine = myLineup(roles, gig, lineups);
  return mine && mine.status !== PAID ? Number(mine.fee_amount) : 0;
}

/** What the Banda still owes for this Show — crew plus sound. Only meaningful for a Dono. */
export function owedByBand(gig: ScopedGig, lineups: ScopedLineup[]): number {
  const crew = lineups
    .filter((l) => l.gig_id === gig.id && l.status !== PAID)
    .reduce((sum, l) => sum + Number(l.fee_amount), 0);
  return crew + (soundUnpaid(gig) ? Number(gig.sound_cost ?? 0) : 0);
}

/**
 * How many Shows to credit a person with: a Dono, every Show of the Banda; a Membro, only the ones
 * already played that they were actually on (a cancelled Show that never happened does not count).
 */
export function showsPlayedCount(roles: BandRoles, gigs: ScopedGig[], lineups: ScopedLineup[], today: Date = startOfToday()): number {
  return gigs.filter((gig) => {
    if (ownsGig(roles, gig)) return true;
    return isPast(gig, today) && !!myLineup(roles, gig, lineups);
  }).length;
}
