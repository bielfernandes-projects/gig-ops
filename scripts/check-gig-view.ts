import assert from 'node:assert/strict';
import {
  isOnLineup,
  lineupRowOf,
  gigsVisibleTo,
  isPast,
  myFee,
  myUnpaidFee,
  owedByBand,
  paymentStatus,
  showsPlayedCount,
  soundUnpaid,
  unsettledGigs,
} from '../lib/gig-view.ts';
import { toIso } from '../lib/time.ts';
import type { BandRoles } from '../lib/band-view.ts';

// Two Bandas: the person owns "Baile" and only plays in "Acústico".
const roles: BandRoles = {
  baile: { name: 'Baile', role: 'admin', memberId: 'me-in-baile' },
  acustico: { name: 'Acústico', role: 'viewer', memberId: 'me-in-acustico' },
};

const gig = (over: Partial<Parameters<typeof soundUnpaid>[0]> & { id: string }) => ({
  start_time: toIso(2026, 1, 10, 21, 0),
  band_id: 'baile',
  bring_sound: false,
  sound_cost: 0,
  is_sound_paid: false,
  ...over,
});

const line = (gig_id: string, member_id: string | null, fee: number, status = 'pendente') => ({
  gig_id,
  member_id,
  fee_amount: fee,
  status,
});

// ── visibility ──────────────────────────────────────────────────────────────
const owned = gig({ id: 'g1', band_id: 'baile' });
const otherBandOn = gig({ id: 'g2', band_id: 'acustico' });
const otherBandOff = gig({ id: 'g3', band_id: 'acustico' });
const noBand = gig({ id: 'g4', band_id: null });

const lineups = [
  line('g1', 'someone-else', 300),
  line('g2', 'me-in-acustico', 250),
  line('g3', 'someone-else', 250),
];

assert.deepEqual(
  gigsVisibleTo(roles, [owned, otherBandOn, otherBandOff, noBand], lineups).map((g) => g.id),
  ['g1', 'g2'],
  'Dono sees every Show of their Banda; Membro only the ones they are scheduled on'
);

// ── an "avulso" must never be mistaken for the viewer ───────────────────────
// A guest typed straight into the Escala has member_id === null. Someone with no roster row of
// their own has memberId === null. A plain `===` would match them and hand over the Show.
{
  const withAvulso = [line('g9', null, 400), line('g9', 'someone-else', 300)];
  assert.equal(isOnLineup(withAvulso, null), false, 'no roster row means not on the Escala');
  assert.equal(lineupRowOf(withAvulso, null), undefined, "and no Cachê is the avulso's");
  assert.equal(isOnLineup(withAvulso, 'someone-else'), true);
  assert.equal(lineupRowOf(withAvulso, 'someone-else')?.fee_amount, 300);
  assert.equal(isOnLineup(withAvulso, 'nobody'), false);
}
// the same guard inside the per-Show helpers
{
  const noRosterRow: BandRoles = { baile: { name: 'Baile', role: 'viewer', memberId: null } };
  const g = gig({ id: 'g9', band_id: 'baile' });
  const lineups9 = [line('g9', null, 400)];
  assert.equal(paymentStatus(noRosterRow, g, lineups9), 'not-scheduled');
  assert.equal(myFee(noRosterRow, g, lineups9), 0);
  assert.deepEqual(gigsVisibleTo(noRosterRow, [g], lineups9), []);
}

// ── "past" is decided by the day, in Brazil ─────────────────────────────────
const today = toIso(2026, 1, 10, 0, 0);
// a Show playing tonight is NOT past — this is where Agenda and Dashboard used to disagree
assert.equal(isPast(gig({ id: 'x', start_time: toIso(2026, 1, 10, 21, 0) }), new Date(today)), false);
assert.equal(isPast(gig({ id: 'x', start_time: toIso(2026, 1, 9, 21, 0) }), new Date(today)), true);
// 23:00 on the 9th in Brazil is 02:00Z on the 10th — still yesterday's Show
assert.equal(isPast(gig({ id: 'x', start_time: '2026-01-10T02:00:00Z' }), new Date(today)), true);

// ── settlement, as a Dono ───────────────────────────────────────────────────
assert.equal(paymentStatus(roles, owned, [line('g1', 'a', 300, 'pago')]), 'settled');
assert.equal(paymentStatus(roles, owned, [line('g1', 'a', 300, 'pago'), line('g1', 'b', 200)]), 'pending');
// the sound alone can hold a Show open
const soundOwed = gig({ id: 'g5', bring_sound: true, sound_cost: 400, is_sound_paid: false });
assert.equal(soundUnpaid(soundOwed), true);
assert.equal(paymentStatus(roles, soundOwed, [line('g5', 'a', 300, 'pago')]), 'pending');
// sound brought but free of charge does not
assert.equal(soundUnpaid(gig({ id: 'g6', bring_sound: true, sound_cost: 0 })), false);

// ── settlement, as a Membro ─────────────────────────────────────────────────
assert.equal(paymentStatus(roles, otherBandOn, [line('g2', 'me-in-acustico', 250, 'pago')]), 'settled');
assert.equal(paymentStatus(roles, otherBandOn, [line('g2', 'me-in-acustico', 250)]), 'pending');
assert.equal(paymentStatus(roles, otherBandOff, lineups), 'not-scheduled');
// a Membro must never be told about a colleague's unpaid Cachê
assert.equal(
  paymentStatus(roles, otherBandOn, [line('g2', 'me-in-acustico', 250, 'pago'), line('g2', 'colega', 900)]),
  'settled'
);

// ── the nag list ────────────────────────────────────────────────────────────
const played = gig({ id: 'p1', start_time: toIso(2026, 1, 5, 21, 0) });
const tonight = gig({ id: 'p2', start_time: toIso(2026, 1, 10, 21, 0) });
assert.deepEqual(
  unsettledGigs(roles, [played, tonight], [line('p1', 'a', 300), line('p2', 'a', 300)], new Date(today)).map((g) => g.id),
  ['p1'],
  "tonight's Show is not nagged about while it is happening"
);

// ── money the viewer may see ────────────────────────────────────────────────
assert.equal(myFee(roles, otherBandOn, lineups), 250);
assert.equal(myFee(roles, owned, lineups), 0, 'a Dono not on the Escala has no Cachê of their own');
assert.equal(myUnpaidFee(roles, otherBandOn, [line('g2', 'me-in-acustico', 250)]), 250);
assert.equal(myUnpaidFee(roles, otherBandOn, [line('g2', 'me-in-acustico', 250, 'pago')]), 0);

assert.equal(owedByBand(owned, [line('g1', 'a', 300), line('g1', 'b', 200, 'pago')]), 300);
assert.equal(owedByBand(soundOwed, [line('g5', 'a', 300)]), 700, 'crew plus sound');

// ── shows played ────────────────────────────────────────────────────────────
assert.equal(
  showsPlayedCount(roles, [owned, tonight], lineups, new Date(today)),
  2,
  'a Dono is credited with every Show of the Banda, future included'
);
assert.equal(
  showsPlayedCount(roles, [otherBandOn, otherBandOff], lineups, new Date(today)),
  0,
  'a Membro is credited only with Shows already played'
);
assert.equal(
  showsPlayedCount(
    roles,
    [gig({ id: 'g2', band_id: 'acustico', start_time: toIso(2026, 1, 5, 21, 0) })],
    lineups,
    new Date(today)
  ),
  1
);

console.log('check-gig-view: ok');
