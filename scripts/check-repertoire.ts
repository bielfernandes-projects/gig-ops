import assert from 'node:assert/strict';
import { byPosition, chartFor, orderedBlocks, resolveKeys, resolveSongKeys, SETLIST_TREE_SELECT } from '../lib/repertoire.ts';
import type { Song, SetlistBlock } from '../lib/repertoire.ts';

const song = (over: Partial<Song> = {}): Song => ({
  id: 's1',
  title: 'Evidências',
  artist: 'Chitãozinho & Xororó',
  original_key: 'C',
  start_key: null,
  notes: null,
  bpm: null,
  source_url: null,
  lyrics_url: null,
  chart_text: null,
  pdf_path: null,
  ...over,
});

// ── the precedence that used to differ per screen ───────────────────────────
// The Banda asked for D; the cifra is written in C. Display D, transpose from C.
{
  const k = resolveKeys({ requested_key: 'D', reference_key: 'C', songs: song({ original_key: 'C' }) });
  assert.equal(k.from, 'C');
  assert.equal(k.to, 'D');
  assert.equal(k.transposed, true);
  assert.equal(k.drifted, false);
}

// No requested_key: play it as written.
{
  const k = resolveKeys({ requested_key: null, reference_key: 'C', songs: song({ original_key: 'C' }) });
  assert.equal(k.to, 'C');
  assert.equal(k.transposed, false);
}

// THE BUG: the Dono corrects original_key C -> D after the Música was added (reference_key stays C).
// All three screens must now transpose FROM D (what the cifra is written in), never from the
// stale snapshot, and must agree on what to display.
{
  const k = resolveKeys({ requested_key: 'E', reference_key: 'C', songs: song({ original_key: 'D' }) });
  assert.equal(k.from, 'D', 'transposes from the current original_key, not the snapshot');
  assert.equal(k.to, 'E');
  assert.equal(k.drifted, true, 'the catalogue changed since this line was added');
}

// A corrected original_key with no requested_key follows the correction.
{
  const k = resolveKeys({ requested_key: null, reference_key: 'C', songs: song({ original_key: 'D' }) });
  assert.equal(k.to, 'D');
  assert.equal(k.transposed, false);
  assert.equal(k.drifted, true);
}

// A Música with no tom at all must not claim to be transposed.
{
  const k = resolveKeys({ requested_key: null, reference_key: null, songs: song({ original_key: null }) });
  assert.deepEqual([k.from, k.to, k.transposed, k.startKey, k.drifted], [null, null, false, null, false]);
}

// A missing Música (deleted from the catalogue) must not throw.
{
  const k = resolveKeys({ requested_key: 'G', reference_key: 'C', songs: null });
  assert.equal(k.from, null);
  assert.equal(k.to, 'G');
  assert.equal(k.transposed, false);
}

// ── "Tom que começa" follows the transposition ──────────────────────────────
{
  const k = resolveKeys({ requested_key: 'D', reference_key: 'C', songs: song({ original_key: 'C', start_key: 'G' }) });
  assert.equal(k.startKey, 'A', 'C->D is +2, so a start on G becomes A');
}
{
  // …and follows a corrected original_key too: D->E is +2 from G
  const k = resolveKeys({ requested_key: 'E', reference_key: 'C', songs: song({ original_key: 'D', start_key: 'G' }) });
  assert.equal(k.startKey, 'A');
}

// ── the reader, outside a Bloco ─────────────────────────────────────────────
{
  const k = resolveSongKeys({ original_key: 'C', requested_key: 'D', start_key: 'G' });
  assert.equal(k.from, 'C');
  assert.equal(k.to, 'D');
  assert.equal(k.startKey, 'A');
  // exactly what the item-level rule says for the same Música
  const item = resolveKeys({ requested_key: 'D', reference_key: 'C', songs: song({ original_key: 'C', start_key: 'G' }) });
  assert.deepEqual([k.from, k.to, k.transposed, k.startKey], [item.from, item.to, item.transposed, item.startKey]);
}

// ── the cifra ───────────────────────────────────────────────────────────────
{
  const keys = { from: 'C', to: 'D' };
  assert.equal(chartFor('C  G  Am', keys), 'D  A  Bm');
  assert.equal(chartFor('C  G  Am', keys, true), 'C  G  Am', 'showing the original leaves it alone');
  assert.equal(chartFor(null, keys), null);
}

// ── ordering and running numbers ────────────────────────────────────────────
const item = (id: string, position: number) => ({
  id,
  position,
  requested_key: null,
  reference_key: null,
  note: null,
  transition_note: null,
  songs: song(),
});

const blocks: SetlistBlock[] = [
  { id: 'b2', name: 'Segunda parte', position: 1, block_songs: [item('x', 1), item('y', 0)] },
  { id: 'b1', name: 'Primeira parte', position: 0, block_songs: [item('a', 0), item('b', 1), item('c', 2)] },
];

const ordered = orderedBlocks(blocks);
assert.deepEqual(ordered.map((o) => o.block.id), ['b1', 'b2']);
assert.deepEqual(ordered.map((o) => o.offset), [0, 3], 'the second Bloco starts at number 4');
assert.deepEqual(ordered[0].items.map((i) => i.id), ['a', 'b', 'c']);
assert.deepEqual(ordered[1].items.map((i) => i.id), ['y', 'x'], 'items are sorted by position, not by array order');

assert.deepEqual([{ position: 2 }, { position: 1 }].sort(byPosition), [{ position: 1 }, { position: 2 }]);

// ── the select string must cover every column the row types declare ─────────
for (const column of ['requested_key', 'reference_key', 'original_key', 'start_key', 'chart_text', 'pdf_path', 'lyrics_url', 'transition_note']) {
  assert.ok(SETLIST_TREE_SELECT.includes(column), `select string is missing ${column}`);
}

console.log('check-repertoire: ok');
