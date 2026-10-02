import assert from 'node:assert/strict';
import {
  advance,
  dayKey,
  dayOffset,
  daysInMonth,
  endOfDayKey,
  fmtDuration,
  fmtTime,
  monthKey,
  showEnd,
  startOfDay,
  startOfDayKey,
  suggestedEndLocalValue,
  toIso,
  toLocalInputValue,
  wallClock,
  ymd,
  DEFAULT_SHOW_MS,
} from '../lib/time.ts';

// The whole point of the module: these must hold whatever TZ the host runs in.
// Run under TZ=UTC (Vercel) and TZ=Asia/Tokyo to prove it.

// ── wall clock ──────────────────────────────────────────────────────────────
// 2026-09-26T23:30:00Z is already the 26th at 20:30 in Brasília.
assert.deepEqual(wallClock('2026-09-26T23:30:00Z'), { year: 2026, month: 9, day: 26, hour: 20, minute: 30 });
// …but 02:00Z on the 27th is still the 26th there.
assert.deepEqual(ymd('2026-09-27T02:00:00Z'), [2026, 9, 26]);
assert.equal(dayKey('2026-09-27T02:00:00Z'), '2026-09-26');
assert.equal(monthKey('2026-10-01T02:00:00Z'), '2026-09');
// midnight must read as hour 0, not 24
assert.equal(wallClock('2026-09-26T03:00:00Z').hour, 0);

// ── building instants ───────────────────────────────────────────────────────
assert.equal(toIso(2026, 9, 26, 20, 30), '2026-09-26T23:30:00.000Z');
assert.equal(toIso(2026, 9, 26), '2026-09-26T03:00:00.000Z');
assert.equal(startOfDay('2026-09-27T02:00:00Z').toISOString(), '2026-09-26T03:00:00.000Z');
assert.equal(startOfDayKey('2026-09-26').toISOString(), '2026-09-26T03:00:00.000Z');
assert.equal(endOfDayKey('2026-09-26').toISOString(), '2026-09-27T02:59:59.999Z');
// round trip
assert.equal(dayKey(startOfDayKey('2026-01-01')), '2026-01-01');

// ── recurrence ──────────────────────────────────────────────────────────────
const weekly = advance('2026-09-26T23:30:00Z', 'weekly');
assert.equal(weekly.toISOString(), '2026-10-03T23:30:00.000Z');
assert.deepEqual(wallClock(weekly), { year: 2026, month: 10, day: 3, hour: 20, minute: 30 });

assert.equal(advance('2026-09-26T23:30:00Z', 'biweekly').toISOString(), '2026-10-10T23:30:00.000Z');
assert.equal(advance('2026-09-26T23:30:00Z', 'monthly').toISOString(), '2026-10-26T23:30:00.000Z');

// monthly clamps instead of overflowing: Jan 31 -> Feb 28, never Mar 3
const jan31 = advance(toIso(2026, 1, 31, 21, 0), 'monthly');
assert.deepEqual(ymd(jan31), [2026, 2, 28]);
assert.equal(wallClock(jan31).hour, 21);
// leap year
assert.deepEqual(ymd(advance(toIso(2028, 1, 31, 21, 0), 'monthly')), [2028, 2, 29]);
// year rollover keeps the time of day
const dec = advance(toIso(2026, 12, 20, 22, 15), 'monthly');
assert.deepEqual(wallClock(dec), { year: 2027, month: 1, day: 20, hour: 22, minute: 15 });
// weekly across a year boundary
assert.deepEqual(ymd(advance(toIso(2026, 12, 29, 20, 0), 'weekly')), [2027, 1, 5]);

assert.equal(daysInMonth(2026, 2), 28);
assert.equal(daysInMonth(2028, 2), 29);
assert.equal(daysInMonth(2026, 12), 31);

// ── show duration ───────────────────────────────────────────────────────────
assert.equal(showEnd('2026-09-26T23:00:00Z', '2026-09-27T02:00:00Z').toISOString(), '2026-09-27T02:00:00.000Z');
assert.equal(
  showEnd('2026-09-26T23:00:00Z', null).getTime() - new Date('2026-09-26T23:00:00Z').getTime(),
  DEFAULT_SHOW_MS
);

// form pre-fill: +2h, expressed in Brazilian wall-clock time
assert.equal(suggestedEndLocalValue('2026-09-26T23:30:00Z'), '2026-09-26T22:30');
assert.equal(toLocalInputValue('2026-09-26T23:30:00Z'), '2026-09-26T20:30');
// crossing midnight in Brasília
assert.equal(suggestedEndLocalValue(toIso(2026, 9, 26, 23, 0)), '2026-09-27T01:00');

// ── formatting ──────────────────────────────────────────────────────────────
assert.equal(fmtTime('2026-09-26T23:30:00Z'), '20:30');
assert.equal(fmtDuration('2026-09-26T23:00:00Z', '2026-09-27T01:30:00Z'), '2h30m de show');
assert.equal(fmtDuration('2026-09-26T23:00:00Z', '2026-09-27T01:00:00Z'), '2h de show');
assert.equal(fmtDuration('2026-09-26T23:00:00Z', '2026-09-26T23:45:00Z'), '45m de show');
assert.equal(fmtDuration('2026-09-26T23:00:00Z', null), '');
assert.equal(fmtDuration('2026-09-26T23:00:00Z', '2026-09-26T22:00:00Z'), '');

// ── dayOffset: whole days on a YYYY-MM-DD key, across month and year ─────────
assert.equal(dayOffset('2026-10-01', -7), '2026-09-24');
assert.equal(dayOffset('2026-01-03', -7), '2025-12-27');
assert.equal(dayOffset('2026-02-26', 3), '2026-03-01');
assert.equal(dayOffset('2024-02-26', 3), '2024-02-29', 'ano bissexto');
assert.equal(dayOffset('2026-10-01', 0), '2026-10-01');

console.log('check-time: ok');
