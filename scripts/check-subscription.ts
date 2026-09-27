import assert from 'node:assert/strict';
import {
  subscriptionLabel,
  subscriptionNotice,
  subscriptionPlan,
  subscriptionState,
  TRIAL_WARNING_DAYS,
} from '../lib/subscription.ts';

const now = new Date('2026-09-27T12:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

// ── the state machine ───────────────────────────────────────────────────────
// A missing row is treated as trial so a data bug never locks a Banda out of its own data.
assert.deepEqual(subscriptionState(null, now), { state: 'trial', daysLeft: null, trialEndsAt: null, paidUntil: null });

{
  const s = subscriptionState({ status: 'trial', trial_ends_at: days(3), paid_until: null }, now);
  assert.equal(s.state, 'trial');
  assert.equal(s.daysLeft, 3);
}
// a trial that ran out is expired, not a trial with negative days
assert.equal(subscriptionState({ status: 'trial', trial_ends_at: days(-1), paid_until: null }, now).state, 'expired');
// the boundary: still a trial while there is any time left
assert.equal(subscriptionState({ status: 'trial', trial_ends_at: days(0.5), paid_until: null }, now).daysLeft, 1);

// paid, with a future renewal date
assert.equal(subscriptionState({ status: 'active', trial_ends_at: days(-30), paid_until: days(20) }, now).state, 'active');
// paid, but the renewal date has passed
assert.equal(subscriptionState({ status: 'active', trial_ends_at: days(-30), paid_until: days(-1) }, now).state, 'expired');
// active with NO paid_until is courtesy access and never expires
assert.equal(subscriptionState({ status: 'active', trial_ends_at: days(-30), paid_until: null }, now).state, 'active');
// an explicitly expired row stays expired
assert.equal(subscriptionState({ status: 'expired', trial_ends_at: days(5), paid_until: null }, now).state, 'expired');

// ── the notice: one threshold, one wording ──────────────────────────────────
assert.equal(subscriptionNotice(null), null);
assert.equal(subscriptionNotice({ state: 'active', daysLeft: null }), null, 'a paid Banda is not nagged');
assert.equal(subscriptionNotice({ state: 'trial', daysLeft: TRIAL_WARNING_DAYS + 1 }), null, 'too early to warn');

{
  const n = subscriptionNotice({ state: 'trial', daysLeft: TRIAL_WARNING_DAYS });
  assert.equal(n?.tone, 'warning');
  assert.match(n!.text, /7 dias/);
}
assert.match(subscriptionNotice({ state: 'trial', daysLeft: 1 })!.text, /1 dia\./, 'singular, not "1 dias"');
assert.equal(subscriptionNotice({ state: 'expired', daysLeft: null })?.tone, 'danger');

// ── the status line ─────────────────────────────────────────────────────────
assert.equal(subscriptionLabel(null), null);
assert.equal(subscriptionLabel({ state: 'active', daysLeft: null })?.tone, 'neutral');
assert.match(subscriptionLabel({ state: 'trial', daysLeft: 1 })!.text, /1 dia restante/);
assert.match(subscriptionLabel({ state: 'trial', daysLeft: 5 })!.text, /5 dias restantes/);
assert.equal(subscriptionLabel({ state: 'expired', daysLeft: null })?.tone, 'danger');

// ── what the Dono can do about billing ──────────────────────────────────────
assert.deepEqual(subscriptionPlan({ state: 'active' }, false), { comped: true, canCheckout: true, canCancel: false });
assert.deepEqual(subscriptionPlan({ state: 'active' }, true), { comped: false, canCheckout: false, canCancel: true });
assert.deepEqual(subscriptionPlan({ state: 'trial' }, false), { comped: false, canCheckout: true, canCancel: false });
assert.deepEqual(subscriptionPlan({ state: 'expired' }, false), { comped: false, canCheckout: true, canCancel: false });
assert.equal(subscriptionPlan(null, false).comped, false, 'no row means trial, not courtesy');

console.log('check-subscription: ok');
