import assert from 'node:assert/strict';
import { transposeChart, semitoneShift, transposeChord, isChord } from '../lib/transpose.ts';

// key math
assert.equal(semitoneShift('C', 'D'), 2);
assert.equal(semitoneShift('E', 'C'), 8);
assert.equal(semitoneShift('Am', 'Bm'), 2);
assert.equal(semitoneShift('G', 'G'), 0);
assert.equal(semitoneShift(null, 'G'), null);

// chords
assert.equal(isChord('C'), true);
assert.equal(isChord('F#m7'), true);
assert.equal(isChord('Bb/D'), true);
assert.equal(isChord('Cadd9'), true);
assert.equal(isChord('Eu'), false);
assert.equal(isChord('vou'), false);
assert.equal(isChord('A'), true); // ambiguous by nature; the line-level check decides
assert.equal(transposeChord('C', 2, false), 'D');
assert.equal(transposeChord('Am7', 3, false), 'Cm7');
assert.equal(transposeChord('G/B', 5, false), 'C/E');
assert.equal(transposeChord('B', 1, false), 'C');
assert.equal(transposeChord('E', 1, true), 'F');
assert.equal(transposeChord('A', 1, true), 'Bb');

// chart: chord line above lyrics, C -> D
const chart = ['[Intro] C G Am F', '', 'C        G', 'Eu vou de novo', 'Am       F', 'A vida segue'].join('\n');
const up = transposeChart(chart, 'C', 'D').split('\n');
assert.equal(up[0], '[Intro] D A Bm G');
assert.equal(up[2], 'D        A');
assert.equal(up[3], 'Eu vou de novo'); // lyrics untouched
assert.equal(up[4], 'Bm       G');
assert.equal(up[5], 'A vida segue'); // "A" as a lyric word must not change

// alignment is kept when a chord grows (C -> Db is +1 char)
const grow = transposeChart('C   G   Am', 'C', 'Db').split('\n')[0];
assert.equal(grow, 'Db  Ab  Bbm');

// inline ChordPro
assert.equal(transposeChart('Eu [C]vou de [G]novo', 'C', 'A'), 'Eu [A]vou de [E]novo');

// no key, same key, unknown key: unchanged
assert.equal(transposeChart(chart, null, 'D'), chart);
assert.equal(transposeChart(chart, 'C', 'C'), chart);
assert.equal(transposeChart(chart, 'C', 'H'), chart);

// flat keys prefer flats
assert.equal(transposeChart('C G', 'C', 'F'), 'F C');
assert.equal(transposeChart('C G', 'C', 'Bb'), 'Bb F');

console.log('transpose: all assertions passed');
