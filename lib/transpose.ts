// Chord transposition over plain text pasted by the musician (no external sources involved).

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

// keys that are written with flats
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

// root + quality/extensions + optional bass, e.g. C, F#m7, Bb/D, G7sus4, Cadd9, D°
const CHORD = /^([A-G](?:#|b)?)((?:m(?!aj)|maj|min|dim|aug|sus|add|M|°|ø|\+|-|\d|\(|\)|#|b|\/(?=\d))*)(?:\/([A-G](?:#|b)?))?$/;

/** Root note of a key label such as "G", "F#m" or "Bb". */
function keyRoot(key: string): string | null {
  const m = /^([A-G](?:#|b)?)/.exec(key.trim());
  return m ? m[1] : null;
}

/** Semitones needed to go from one key to another (0..11), or null if either is unknown. */
export function semitoneShift(fromKey: string | null | undefined, toKey: string | null | undefined): number | null {
  if (!fromKey || !toKey) return null;
  const a = keyRoot(fromKey);
  const b = keyRoot(toKey);
  if (!a || !b || SEMITONE[a] === undefined || SEMITONE[b] === undefined) return null;
  return (SEMITONE[b] - SEMITONE[a] + 12) % 12;
}

const preferFlats = (toKey: string) => {
  const root = keyRoot(toKey);
  if (!root) return false;
  const label = `${root}${/^[A-G](?:#|b)?m(?!aj)/.test(toKey.trim()) ? 'm' : ''}`;
  return FLAT_KEYS.has(label);
};

function shiftNote(note: string, shift: number, flats: boolean): string {
  const idx = SEMITONE[note];
  if (idx === undefined) return note;
  return (flats ? FLATS : SHARPS)[(idx + shift) % 12];
}

export function isChord(token: string): boolean {
  return CHORD.test(token);
}

export function transposeChord(chord: string, shift: number, flats: boolean): string {
  const m = CHORD.exec(chord);
  if (!m) return chord;
  const [, root, rest, bass] = m;
  return shiftNote(root, shift, flats) + rest + (bass ? `/${shiftNote(bass, shift, flats)}` : '');
}

/** Moves the "starts on" chord along with the song: same semitone shift as original -> requested key. */
export function transposeStartKey(startKey: string | null | undefined, fromKey: string | null | undefined, toKey: string | null | undefined): string | null {
  if (!startKey) return null;
  const shift = semitoneShift(fromKey, toKey);
  if (shift === null || shift === 0 || !toKey) return startKey;
  return transposeChord(startKey, shift, preferFlats(toKey));
}

/** A line is a chord line when most of its words are chords (ignores section labels like "[Intro]"). */
function isChordLine(line: string): boolean {
  const tokens = line.replace(/[[\]|]/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const chords = tokens.filter(isChord).length;
  return chords / tokens.length >= 0.6;
}

/** Replaces chords in a chord line while keeping the columns aligned with the lyrics below. */
function shiftChordLine(line: string, shift: number, flats: boolean): string {
  let out = '';
  let carry = 0; // extra columns already consumed from following spaces
  const parts = line.split(/(\s+)/);

  for (const part of parts) {
    if (part === '') continue;
    if (/^\s+$/.test(part)) {
      // give back columns eaten by a longer chord, but keep at least one space
      const eat = Math.min(carry, Math.max(0, part.length - 1));
      out += part.slice(eat) + (carry < 0 ? ' '.repeat(-carry) : '');
      carry = carry > 0 ? carry - eat : 0;
      continue;
    }
    const bracket = /^(\[|\()?(.+?)(\]|\))?$/.exec(part);
    const core = bracket ? bracket[2] : part;
    if (!isChord(core)) {
      out += part;
      continue;
    }
    const next = transposeChord(core, shift, flats);
    const replaced = `${bracket?.[1] ?? ''}${next}${bracket?.[3] ?? ''}`;
    carry += replaced.length - part.length;
    out += replaced;
  }
  return out;
}

/** Inline chords in brackets inside lyric lines (ChordPro style: "Eu [C]vou de [G]novo"). */
function shiftInlineChords(line: string, shift: number, flats: boolean): string {
  return line.replace(/\[([^\]\s]+)\]/g, (whole, inner: string) => (isChord(inner) ? `[${transposeChord(inner, shift, flats)}]` : whole));
}

/**
 * Transposes a pasted chart from its original key to another one. If a key is missing or the keys
 * are equal, the text is returned untouched.
 */
export function transposeChart(text: string, fromKey: string | null | undefined, toKey: string | null | undefined): string {
  const shift = semitoneShift(fromKey, toKey);
  if (shift === null || shift === 0 || !toKey) return text;

  const flats = preferFlats(toKey);
  return text
    .split('\n')
    .map((line) => (isChordLine(line) ? shiftChordLine(line, shift, flats) : shiftInlineChords(line, shift, flats)))
    .join('\n');
}
