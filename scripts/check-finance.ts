import assert from 'node:assert/strict';
import { splitProfit, gigFinance } from '../lib/finance.ts';

// equal split among owners with no shares defined
const equal = splitProfit(900, [{ id: 'a', share: null }, { id: 'b', share: null }, { id: 'c', share: null }]);
assert.deepEqual(equal.map((r) => r.amount), [300, 300, 300]);

// one owner has 50%, the other two split the rest
const mixed = splitProfit(1000, [{ id: 'a', share: 50 }, { id: 'b', share: null }, { id: 'c', share: null }]);
assert.deepEqual(mixed.map((r) => r.amount), [500, 250, 250]);

// cents never get lost: the amounts always add up to the profit
const odd = splitProfit(100, [{ id: 'a', share: null }, { id: 'b', share: null }, { id: 'c', share: null }]);
assert.equal(Math.round(odd.reduce((s, r) => s + r.amount, 0) * 100) / 100, 100);

// shares above 100 are scaled down
const over = splitProfit(300, [{ id: 'a', share: 80 }, { id: 'b', share: 80 }]);
assert.deepEqual(over.map((r) => r.amount), [150, 150]);

// negative profit is split the same way
const loss = splitProfit(-200, [{ id: 'a', share: null }, { id: 'b', share: null }]);
assert.deepEqual(loss.map((r) => r.amount), [-100, -100]);

assert.deepEqual(splitProfit(100, []), []);

// gig finance: legacy (no receipt tracking) counts the gross as received
const legacy = gigFinance({ gross: 1000, lineupCost: 600, soundCost: 100, expenses: 50, trackReceipts: false, received: 0 });
assert.equal(legacy.profit, 250);
assert.equal(legacy.received, 1000);
assert.equal(legacy.pending, 0);

// with receipt tracking only what was received counts
const tracked = gigFinance({ gross: 1000, lineupCost: 0, soundCost: 0, expenses: 0, trackReceipts: true, received: 400 });
assert.equal(tracked.received, 400);
assert.equal(tracked.pending, 600);

console.log('finance: all assertions passed');
