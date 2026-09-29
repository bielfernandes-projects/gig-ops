'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth';
import { logAction } from '@/lib/telemetry';
import { normalizeKey, titleKey } from '@/lib/repertoire-import';

export type ImportPayload = {
  bandId: string;
  setlistName: string;
  blocks: {
    name: string | null;
    songs: { title: string; artist: string | null; key: string | null; lyricHint: string | null; note: string | null; existingId: string | null }[];
  }[];
};

const MAX_SONGS = 500;
const cut = (v: string | null | undefined, n: number) => (v ?? '').trim().slice(0, n) || null;

/**
 * Saves what the person reviewed on the import screen: the new songs go to the band catalog, and a
 * band setlist is created with the blocks as they were in the document. Songs that already exist in the
 * catalog are reused (never duplicated), and a song repeated across blocks is one catalog row.
 * Supabase has no multi-table transaction here, so if a step fails the rows created so far are removed.
 */
export async function saveImportedRepertoire(payload: ImportPayload) {
  const ctx = await requireOwner('repertorio', payload.bandId);
  if (!ctx.ok) return { error: ctx.error };

  const setlistName = cut(payload.setlistName, 80);
  if (!setlistName) return { error: 'Informe o nome do repertório.' };
  const total = payload.blocks.reduce((n, b) => n + b.songs.length, 0);
  if (total === 0) return { error: 'Não há músicas para importar.' };
  if (total > MAX_SONGS) return { error: `Muitas músicas de uma vez (máximo ${MAX_SONGS}).` };
  if (payload.blocks.some((b) => b.songs.some((s) => !s.title.trim()))) return { error: 'Toda música precisa de um nome.' };

  // Only ids that really belong to this band's catalog count as "already there".
  const wanted = [...new Set(payload.blocks.flatMap((b) => b.songs.map((s) => s.existingId)).filter((id): id is string => Boolean(id)))];
  const known = new Map<string, string | null>();
  if (wanted.length > 0) {
    const { data } = await ctx.supabase.from('songs').select('id, original_key').eq('band_id', ctx.bandId).eq('scope', 'band').in('id', wanted);
    for (const s of data ?? []) known.set(s.id as string, (s.original_key as string | null) ?? null);
  }

  type NewSong = { id: string; title: string; artist: string | null; original_key: string | null; notes: string | null };
  const created = new Map<string, NewSong>(); // titleKey -> the one catalog row for this title
  const items: { blockIdx: number; songId: string; key: string | null; note: string | null }[] = [];

  payload.blocks.forEach((block, blockIdx) => {
    for (const s of block.songs) {
      const key = normalizeKey(s.key);
      const hint = cut(s.lyricHint, 200);
      const notes = hint ? `Começa com "${hint}"` : null;
      let songId: string;
      let songKey: string | null;
      if (s.existingId && known.has(s.existingId)) {
        songId = s.existingId;
        songKey = known.get(s.existingId) ?? null;
      } else {
        const k = titleKey(s.title);
        const prev = created.get(k);
        if (prev) {
          // Same title again: keep the first row, fill whatever it was missing.
          prev.artist ??= cut(s.artist, 120);
          prev.original_key ??= key;
          prev.notes ??= notes;
          songId = prev.id;
          songKey = prev.original_key;
        } else {
          const row: NewSong = { id: crypto.randomUUID(), title: cut(s.title, 200)!, artist: cut(s.artist, 120), original_key: key, notes };
          created.set(k, row);
          songId = row.id;
          songKey = row.original_key;
        }
      }
      items.push({ blockIdx, songId, key: songKey, note: cut(s.note, 500) });
    }
  });

  const newSongs = [...created.values()];
  const setlistId = crypto.randomUUID();
  const undo = async () => {
    await ctx.supabase.from('setlists').delete().eq('id', setlistId); // blocks and block_songs go with it (cascade)
    if (newSongs.length > 0) {
      await ctx.supabase
        .from('songs')
        .delete()
        .in('id', newSongs.map((s) => s.id));
    }
  };

  if (newSongs.length > 0) {
    const { error } = await ctx.supabase.from('songs').insert(newSongs.map((s) => ({ ...s, band_id: ctx.bandId, created_by: ctx.userId, scope: 'band' })));
    if (error) return { error: 'Não foi possível salvar as músicas.' };
  }

  const { error: setlistError } = await ctx.supabase.from('setlists').insert({ id: setlistId, band_id: ctx.bandId, name: setlistName, scope: 'band', created_by: ctx.userId });
  if (setlistError) {
    await undo();
    return { error: 'Não foi possível criar o repertório.' };
  }

  const blockIds = payload.blocks.map(() => crypto.randomUUID());
  const { error: blocksError } = await ctx.supabase
    .from('blocks')
    .insert(payload.blocks.map((b, i) => ({ id: blockIds[i], setlist_id: setlistId, name: cut(b.name, 80) ?? `Bloco ${i + 1}`, position: i })));
  if (blocksError) {
    await undo();
    return { error: 'Não foi possível criar os blocos.' };
  }

  const position = new Map<number, number>();
  const { error: itemsError } = await ctx.supabase.from('block_songs').insert(
    items.map((it) => {
      const pos = position.get(it.blockIdx) ?? 0;
      position.set(it.blockIdx, pos + 1);
      return { block_id: blockIds[it.blockIdx], song_id: it.songId, reference_key: it.key, requested_key: it.key, note: it.note, position: pos };
    }),
  );
  if (itemsError) {
    await undo();
    return { error: 'Não foi possível montar os blocos.' };
  }

  await logAction('repertorio_importado', ctx.userId, ctx.bandId);
  revalidatePath('/repertorio');
  return { success: true, setlistId, created: newSongs.length, reused: new Set(items.map((i) => i.songId)).size - newSongs.length };
}
