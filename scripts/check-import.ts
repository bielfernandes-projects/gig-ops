import assert from 'node:assert/strict';
import { cleanImportResult, missingFields, normalizeKey, titleKey } from '../lib/repertoire-import.ts';

// keys as musicians write them → the app's key list (sharps only)
assert.equal(normalizeKey('F#'), 'F#');
assert.equal(normalizeKey('Bb'), 'A#', 'flats become sharps');
assert.equal(normalizeKey('Eb'), 'D#');
assert.equal(normalizeKey('Am'), 'Am');
assert.equal(normalizeKey('G#m'), 'G#m');
assert.equal(normalizeKey('Bbm'), 'A#m');
assert.equal(normalizeKey('GM'), 'G', 'uppercase M is major, not minor');
assert.equal(normalizeKey('F#7'), 'F#', 'extensions are dropped');
assert.equal(normalizeKey(' d '), 'D');
assert.equal(normalizeKey('Cmaj'), 'C');
assert.equal(normalizeKey(null), null);
assert.equal(normalizeKey(''), null);
assert.equal(normalizeKey('Valeu'), null, 'a word is not a key');
assert.equal(normalizeKey('G - Am7'), null, 'a chord sequence is not a key');
assert.equal(normalizeKey('H'), null);

// the model's output is re-validated: bad keys dropped (kept in the note), blank titles and empty blocks removed
const cleaned = cleanImportResult({
  blocks: [
    { name: ' Bloco 1 ', songs: [{ title: ' Valeu ', key: 'C', artist: '' }, { title: '  ' }, { title: 'Meu Lugar', key: 'xyz', note: 'solo' }] },
    { name: 'Vazio', songs: [{ title: '' }] },
    { name: null, songs: [{ title: 'Sinais', key: 'Bb', artist: 'Fulano' }] },
  ],
});
assert.equal(cleaned.blocks.length, 2, 'empty block removed');
assert.equal(cleaned.blocks[0].name, 'Bloco 1');
assert.equal(cleaned.blocks[0].songs.length, 2, 'blank title removed');
assert.deepEqual(cleaned.blocks[0].songs[0], { title: 'Valeu', artist: null, key: 'C', lyricHint: null, note: null });
assert.equal(cleaned.blocks[0].songs[1].key, null);
assert.equal(cleaned.blocks[0].songs[1].note, 'solo (tom no documento: xyz)');
assert.equal(cleaned.blocks[1].songs[0].key, 'A#');
assert.deepEqual(cleanImportResult(null), { blocks: [] });

// what the preview flags
assert.deepEqual(missingFields({ title: 'A', artist: null, key: null, lyricHint: null, note: null }), ['key', 'artist']);
assert.deepEqual(missingFields({ title: 'A', artist: 'X', key: 'C', lyricHint: null, note: null }), []);

// catalog matching ignores case, accents and punctuation
assert.equal(titleKey('FALSO HEROI'), titleKey('Falso Herói'));
assert.equal(titleKey('Meu Reggae é Roots!'), titleKey('meu reggae e roots'));
assert.notEqual(titleKey('Ela'), titleKey('Ela Mexe Comigo'));
