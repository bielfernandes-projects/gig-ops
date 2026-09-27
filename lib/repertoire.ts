/**
 * The shape of a Repertório and the one rule for "which tom is this Música in".
 *
 * The row types used to be declared four times (SetlistSong / PublicSong / CatalogSong / SongView)
 * and the nested select string twice, and each copy encoded a different key precedence — so the
 * in-app Repertório, the public link and the full-screen reader could show three different toms for
 * the same Música, with the transposed cifra using a base the badge above it contradicted.
 *
 * Client-safe: no server imports.
 */

import { transposeChart, transposeStartKey } from '@/lib/transpose';

// ─── Rows ───────────────────────────────────────────────────────────────────

/** A Música in the Banda's catalogue. `original_key` is the tom `chart_text` is written in. */
export type Song = {
  id: string;
  title: string;
  artist: string | null;
  original_key: string | null;
  /** The tom the Música *starts* on, when it differs from the harmony's tom ("Tom que começa"). */
  start_key: string | null;
  notes: string | null;
  bpm: number | null;
  source_url: string | null;
  lyrics_url: string | null;
  chart_text: string | null;
  pdf_path: string | null;
};

/** One line of a Bloco: a Música plus what this Repertório asks of it. */
export type SetlistItem = {
  id: string;
  position: number;
  /** The tom this Banda plays it in. Null means "as written". */
  requested_key: string | null;
  /**
   * Snapshot of the Música's `original_key` when it was added to the Bloco. Informational only:
   * it tells us the catalogue has since been corrected (see `resolveKeys().drifted`). It must never
   * drive display or transposition — `chart_text` and `original_key` move together, so a stale
   * snapshot would transpose from a base the cifra is not written in.
   */
  reference_key: string | null;
  note: string | null;
  transition_note: string | null;
  songs: Song | null;
};

export type SetlistBlock = { id: string; name: string; position: number; block_songs: SetlistItem[] };
export type SetlistTree = { id: string; name: string; blocks: SetlistBlock[] };

/** A Música as offered in the "add to Bloco" picker. */
export type CatalogOption = { id: string; title: string; artist: string | null; original_key: string | null };

export type BandSetlistOption = { id: string; name: string; is_default: boolean };

/** The Blocos-and-Músicas part of the select, matching `SetlistBlock` / `SetlistItem` / `Song`. */
export const BLOCKS_SELECT =
  'blocks(id, name, position, block_songs(id, position, requested_key, reference_key, note, transition_note, songs(id, title, artist, original_key, start_key, notes, bpm, source_url, lyrics_url, chart_text, pdf_path)))';

/**
 * The nested select every Repertório read uses. One string, so the pages cannot drift from the row
 * types above — and so adding a column is one edit.
 */
export const SETLIST_TREE_SELECT = `id, name, ${BLOCKS_SELECT}`;

/** The same tree plus the columns that decide who may edit it (the library page needs both). */
export const SETLIST_TREE_SELECT_WITH_SCOPE = `id, name, scope, owner_user_id, band_id, ${BLOCKS_SELECT}`;

// ─── The one key rule ───────────────────────────────────────────────────────

export type ResolvedKeys = {
  /** The tom the cifra is written in — the transposition source. */
  from: string | null;
  /** The tom to play and to display. */
  to: string | null;
  /** True when `to` differs from `from`, i.e. the cifra needs transposing. */
  transposed: boolean;
  /** "Tom que começa", already moved to `to`. */
  startKey: string | null;
  /** The Música's `original_key` was corrected after it was added to this Bloco. */
  drifted: boolean;
};

/**
 * Which tom to show and which to transpose from, for one line of a Bloco. The single answer that
 * the in-app Repertório, the public link and the full-screen reader all read.
 */
export function resolveKeys(item: Pick<SetlistItem, 'requested_key' | 'reference_key'> & { songs: Song | null }): ResolvedKeys {
  const song = item.songs;
  const from = song?.original_key ?? null;
  const to = item.requested_key ?? from;
  return {
    from,
    to,
    transposed: !!from && !!to && from !== to,
    startKey: transposeStartKey(song?.start_key ?? null, from, to),
    drifted: !!item.reference_key && !!from && item.reference_key !== from,
  };
}

/** The same rule for a Música read on its own, outside a Bloco (the reader's `SongView`). */
export function resolveSongKeys(song: {
  original_key: string | null;
  start_key?: string | null;
  requested_key?: string | null;
}): Omit<ResolvedKeys, 'drifted'> {
  const from = song.original_key ?? null;
  const to = song.requested_key ?? from;
  return {
    from,
    to,
    transposed: !!from && !!to && from !== to,
    startKey: transposeStartKey(song.start_key ?? null, from, to),
  };
}

/** The cifra as it should be read: transposed to `to`, or as written when showing the original. */
export function chartFor(chart: string | null, keys: Pick<ResolvedKeys, 'from' | 'to'>, showOriginal = false): string | null {
  if (!chart || showOriginal) return chart;
  return transposeChart(chart, keys.from, keys.to);
}

// ─── Ordering ───────────────────────────────────────────────────────────────

export const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Blocos in order, each carrying the running number its first Música gets in the whole Repertório. */
export function orderedBlocks(blocks: SetlistBlock[]): { block: SetlistBlock; items: SetlistItem[]; offset: number }[] {
  const sorted = [...blocks].sort(byPosition);
  let offset = 0;
  return sorted.map((block) => {
    const items = [...block.block_songs].sort(byPosition);
    const entry = { block, items, offset };
    offset += items.length;
    return entry;
  });
}
