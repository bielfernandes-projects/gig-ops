import assert from 'node:assert/strict';
import { decideTier } from '../lib/billing-rules.ts';
import { PRICE_TABLE, priceOf } from '../lib/pricing.ts';
import { toBandRoles } from '../lib/band-view.ts';
import { myUnpaidFee, owedByBand, paymentStatus } from '../lib/gig-view.ts';
import { FREELA_LIMITS, IMPORT_QUOTA } from '../lib/plans.ts';

// ── prices: what the decisions of the pricing session say ───────────────────
assert.equal(priceOf('banda', 'principal', 'monthly'), 49.9);
assert.equal(priceOf('banda', 'principal', 'monthly', true), 24.9, 'founder price: principal Banda, monthly');
assert.equal(priceOf('banda', 'principal', 'annual', true), 499, 'the founder price is monthly only');
assert.equal(priceOf('banda', 'adesao', 'monthly', true), 29.9, 'an adesão never gets the founder price');
assert.equal(priceOf('freela', 'principal', 'monthly'), 14.9);
assert.equal(priceOf('freela', 'adesao', 'monthly'), 9.9);
assert.equal(priceOf('freela', 'principal', 'monthly', true), 14.9, 'no founder price on a Freela');
// annual is 10 months, as the Banda plan always was
for (const kind of ['banda', 'freela'] as const) {
  for (const tier of ['principal', 'adesao'] as const) {
    const p = PRICE_TABLE[kind][tier];
    assert.equal(Math.round(p.monthly * 10), Math.round(p.annual), `${kind}/${tier}: annual = 10 months`);
  }
}

// ── who is principal ────────────────────────────────────────────────────────
const banda = (createdAt: string, founder = false) => ({ kind: 'banda' as const, founder, createdAt });
const freela = (createdAt: string) => ({ kind: 'freela' as const, founder: false, createdAt });

// first account: principal, and the founder price is available to a Banda
assert.deepEqual(decideTier([], banda('2026-01-01')), { tier: 'principal', founder: true });
assert.deepEqual(decideTier([], freela('2026-01-01')), { tier: 'principal', founder: false });
// a Banda next to a paid Banda: adesão, never founder
assert.deepEqual(decideTier([banda('2026-01-01')], banda('2026-02-01')), { tier: 'adesao', founder: false });
// a Freela next to a Banda: adesão
assert.equal(decideTier([banda('2026-01-01')], freela('2026-02-01')).tier, 'adesao');
// a Banda added to a paying Freela outranks it: pays full (the Freela is repriced to adesão later)
assert.deepEqual(decideTier([freela('2026-01-01')], banda('2026-02-01')), { tier: 'principal', founder: true });
// ...but not the founder price if the person already holds one
assert.deepEqual(decideTier([banda('2026-01-01', true)], banda('2026-02-01')), { tier: 'adesao', founder: false });
// two Freelas: the oldest is principal
assert.equal(decideTier([freela('2026-01-01')], freela('2026-02-01')).tier, 'adesao');

// ── a Freela owner is a musician on every gig of the account ────────────────
const roles = toBandRoles({
  f: { name: 'Freelas', role: 'admin', memberId: 'me', kind: 'freela' },
  b: { name: 'Banda', role: 'admin', memberId: null, kind: 'banda' },
});
assert.equal(roles.f.role, 'viewer', 'Freela owner reads as a musician');
assert.equal(roles.b.role, 'admin');

const gig = { id: 'g1', band_id: 'f', start_time: '2026-01-01T20:00:00Z', end_time: null, bring_sound: false, sound_cost: 0, is_sound_paid: false };
const mine = (status: string) => [{ gig_id: 'g1', member_id: 'me', fee_amount: 300, status }];
// the cachê is theirs to receive; nothing is "owed to the team"
assert.equal(myUnpaidFee(roles, gig as never, mine('pendente') as never), 300);
assert.equal(paymentStatus(roles, gig as never, mine('pendente') as never), 'pending');
assert.equal(paymentStatus(roles, gig as never, mine('pago') as never), 'settled');
assert.equal(myUnpaidFee(roles, gig as never, mine('pago') as never), 0);
assert.equal(owedByBand(gig as never, mine('pago') as never), 0);

// ── limits ──────────────────────────────────────────────────────────────────
assert.equal(IMPORT_QUOTA, 20);
assert.deepEqual(FREELA_LIMITS, { songs: 150, setlists: 3 });

console.log('check-plans: ok');
