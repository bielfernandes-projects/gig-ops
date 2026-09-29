// Pure part of the repertoire import (types, key/title rules, cleaning of the IA output). No server code in here,
// so the import screen in the browser can use it too.
import { MUSICAL_KEYS } from '@/lib/keys';

/** One song as read from the document. Every field but `title` may be absent: the IA never guesses. */
export type ImportedSong = {
  title: string;
  artist: string | null;
  /** Normalized to the app's key list (`MUSICAL_KEYS`); null when the document had none or it was unreadable. */
  key: string | null;
  /** First line of the lyrics, when the document gave one ("Início" column, text in parentheses). */
  lyricHint: string | null;
  /** Anything else about how to play it: solo, transition, "só refrão", chord sequence, markers. */
  note: string | null;
};

export type ImportedBlock = { name: string | null; songs: ImportedSong[] };

export type ImportResult = { blocks: ImportedBlock[] };

// ─── keys ────────────────────────────────────────────────────────────────────

const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

/**
 * Turns a key as musicians write it into one of the app's keys, or null when it isn't a key.
 * Flats become sharps (the app only lists sharps), extensions are dropped ("F#7" → "F#"), and an
 * uppercase M is a major chord, not a minor ("GM" → "G"; "Gm" → "Gm").
 */
export function normalizeKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^([A-Ga-g])([#b♯♭])?\s*(m(?!aj)|min|M|maj)?\d*(?:sus\d?|dim|aug|add\d+|[+°º])?$/);
  if (!m) return null;
  const root = m[1].toUpperCase() + (m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : (m[2] ?? ''));
  const minor = m[3] === 'm' || m[3] === 'min';
  const note = FLAT_TO_SHARP[root] ?? root;
  const key = minor ? `${note}m` : note;
  return MUSICAL_KEYS.includes(key) ? key : null;
}

/** A title as compared for "already in the catalog": no accents, case or punctuation ("FALSO HEROI" = "Falso Herói"). */
export function titleKey(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ─── after the IA: clean the shape ───────────────────────────────────────────

type RawSong = { title?: unknown; artist?: unknown; key?: unknown; lyricHint?: unknown; note?: unknown };
type RawResult = { blocks?: { name?: unknown; songs?: RawSong[] }[] };

const text = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t === '' ? null : t;
};

/**
 * Validates whatever the model returned and puts it in the app's shape. The model is told the rules,
 * but the code is what guarantees them: a key it invented in an unusual spelling is dropped here (and
 * its raw text kept in the note), blank titles are discarded, empty blocks disappear.
 */
export function cleanImportResult(raw: unknown): ImportResult {
  const blocks: ImportedBlock[] = [];
  for (const b of (raw as RawResult)?.blocks ?? []) {
    const songs: ImportedSong[] = [];
    for (const s of b?.songs ?? []) {
      const title = text(s?.title);
      if (!title) continue;
      const rawKey = text(s?.key);
      const key = normalizeKey(rawKey);
      let note = text(s?.note);
      if (rawKey && !key) note = note ? `${note} (tom no documento: ${rawKey})` : `Tom no documento: ${rawKey}`;
      songs.push({ title, artist: text(s?.artist), key, lyricHint: text(s?.lyricHint), note });
    }
    if (songs.length > 0) blocks.push({ name: text(b?.name), songs });
  }
  return { blocks };
}

/** What the preview screen flags: the three fields a song needs to be useful in the catalog. */
export function missingFields(song: ImportedSong): ('title' | 'artist' | 'key')[] {
  const missing: ('title' | 'artist' | 'key')[] = [];
  if (!song.title.trim()) missing.push('title');
  if (!song.key) missing.push('key');
  if (!song.artist) missing.push('artist');
  return missing;
}
