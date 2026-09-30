import assert from 'node:assert/strict';
import { isNewUpdate, timeAgo } from '../lib/notification-model.ts';

// an update is new when it was launched after the person last closed the pop-up
assert.equal(isNewUpdate('2026-10-02T12:00:00Z', '2026-10-01T12:00:00Z'), true);
assert.equal(isNewUpdate('2026-10-01T12:00:00Z', '2026-10-02T12:00:00Z'), false, 'lançada antes de a pessoa fechar o pop-up');
assert.equal(isNewUpdate('2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z'), false, 'mesmo instante já conta como visto');
assert.equal(isNewUpdate('2026-10-01T12:00:00Z', null), true, 'sem registro de visita, tudo é novo');

// relative time shown in the bell
const now = Date.parse('2026-10-10T12:00:00Z');
assert.equal(timeAgo('2026-10-10T11:59:40Z', now), 'agora');
assert.equal(timeAgo('2026-10-10T11:55:00Z', now), 'há 5 min');
assert.equal(timeAgo('2026-10-10T09:00:00Z', now), 'há 3 h');
assert.equal(timeAgo('2026-10-08T12:00:00Z', now), 'há 2 d');
assert.match(timeAgo('2026-09-01T12:00:00Z', now), /^\d{2}\/\d{2}\/\d{2}$/, 'depois de uma semana vira data curta');

console.log('check-notifications: ok');
