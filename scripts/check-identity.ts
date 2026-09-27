import assert from 'node:assert/strict';
import { identityKey, isViewer, memberRowsFilter, sameHuman } from '../lib/identity.ts';

// ── the key ─────────────────────────────────────────────────────────────────
assert.equal(identityKey({ user_id: 'u1', email: 'joao@gmail.com' }), 'u1', 'the account wins');
assert.equal(identityKey({ user_id: null, email: 'Joao@Gmail.com' }), 'joao@gmail.com', 'e-mail is folded');
assert.equal(identityKey({ user_id: null, email: '  Joao@Gmail.com ' }), 'joao@gmail.com', 'and trimmed');
assert.equal(identityKey({ user_id: null, email: null }), null, 'an avulso has no identity');
assert.equal(identityKey({}), null);

// ── same human across Bandas ────────────────────────────────────────────────
assert.equal(sameHuman({ user_id: 'u1' }, { user_id: 'u1' }), true);
assert.equal(sameHuman({ user_id: 'u1' }, { user_id: 'u2' }), false);
// THE BUG: two copies of this rule folded case, two did not
assert.equal(sameHuman({ email: 'Joao@Gmail.com' }, { email: 'joao@gmail.com' }), true);
assert.equal(sameHuman({ user_id: null, email: 'JOAO@GMAIL.COM' }, { user_id: null, email: 'joao@gmail.com' }), true);
// a linked row and an unlinked row of the same person still match on e-mail
assert.equal(sameHuman({ user_id: 'u1', email: 'joao@gmail.com' }, { user_id: null, email: 'Joao@Gmail.com' }), true);
// different accounts are different people even if one has no e-mail
assert.equal(sameHuman({ user_id: 'u1', email: null }, { user_id: 'u2', email: 'joao@gmail.com' }), false);
// two avulsos are never the same person
assert.equal(sameHuman({ user_id: null, email: null }, { user_id: null, email: null }), false);

// ── is this row me? ─────────────────────────────────────────────────────────
const me = { userId: 'u1', email: 'Joao@Gmail.com' };
assert.equal(isViewer({ user_id: 'u1' }, me), true);
assert.equal(isViewer({ user_id: null, email: 'joao@gmail.com' }, me), true);
assert.equal(isViewer({ user_id: null, email: 'outro@gmail.com' }, me), false);
assert.equal(isViewer({ user_id: null, email: null }, me), false);
assert.equal(isViewer({ user_id: 'u1' }, { userId: null, email: 'joao@gmail.com' }), false, 'no session, no identity');

// ── the PostgREST filter ────────────────────────────────────────────────────
assert.equal(memberRowsFilter({ userId: 'u1', email: 'joao@gmail.com' }), 'user_id.eq.u1,email.eq."joao@gmail.com"');
assert.equal(memberRowsFilter({ userId: 'u1', email: 'Joao@Gmail.com' }), 'user_id.eq.u1,email.eq."joao@gmail.com"');
assert.equal(memberRowsFilter({ userId: 'u1' }), 'user_id.eq.u1');
assert.equal(memberRowsFilter({ userId: 'u1', email: null }), 'user_id.eq.u1');
assert.equal(memberRowsFilter({ userId: 'u1', email: '' }), 'user_id.eq.u1');
// a quote in the address cannot close the value and inject another filter
assert.equal(
  memberRowsFilter({ userId: 'u1', email: 'a".or(x.eq.1)@b.com' }),
  'user_id.eq.u1,email.eq."a\\".or(x.eq.1)@b.com"'
);
assert.equal(memberRowsFilter({ userId: 'u1', email: 'a\\b@c.com' }), 'user_id.eq.u1,email.eq."a\\\\b@c.com"');

console.log('check-identity: ok');
