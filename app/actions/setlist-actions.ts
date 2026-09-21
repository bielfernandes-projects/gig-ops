'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type Owner = Extract<Awaited<ReturnType<typeof requireOwner>>, { ok: true }>;

async function refresh(ctx: Owner, setlistId: string) {
  const { data } = await ctx.supabase.from('setlists').select('gig_id').eq('id', setlistId).maybeSingle();
  if (data?.gig_id) revalidatePath(`/gigs/${data.gig_id}`);
  revalidatePath('/repertorio');
}

/** The setlist must belong to the caller's band (RLS already guarantees it; this gives a clean error). */
async function setlistOf(ctx: Owner, blockId: string): Promise<string | null> {
  const { data } = await ctx.supabase.from('blocks').select('setlist_id').eq('id', blockId).maybeSingle();
  return data?.setlist_id ?? null;
}

export async function createGigSetlist(gigId: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: gig } = await ctx.supabase.from('go_gigs').select('id, title').eq('id', gigId).eq('band_id', ctx.bandId).maybeSingle();
  if (!gig) return { error: 'Show não encontrado.' };

  const { data: setlist, error } = await ctx.supabase
    .from('setlists')
    .insert({ band_id: ctx.bandId, gig_id: gigId, name: gig.title, created_by: ctx.userId })
    .select('id')
    .single();
  if (error || !setlist) return { error: 'Não foi possível criar o repertório (este show já tem um?).' };

  await ctx.supabase.from('blocks').insert({ setlist_id: setlist.id, name: 'Bloco 1', position: 0 });

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath('/repertorio');
  return { success: true };
}

export async function deleteSetlist(setlistId: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  await refresh(ctx, setlistId);
  const { error } = await ctx.supabase.from('setlists').delete().eq('id', setlistId).eq('band_id', ctx.bandId);
  if (error) return { error: 'Não foi possível remover o repertório.' };
  return { success: true };
}

export async function addBlock(setlistId: string, name: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const clean = name.trim().slice(0, 80);
  if (!clean) return { error: 'Informe o nome do bloco.' };

  const { data: last } = await ctx.supabase.from('blocks').select('position').eq('setlist_id', setlistId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { error } = await ctx.supabase.from('blocks').insert({ setlist_id: setlistId, name: clean, position: (last?.position ?? -1) + 1 });
  if (error) return { error: 'Não foi possível criar o bloco.' };

  await refresh(ctx, setlistId);
  return { success: true };
}

export async function renameBlock(blockId: string, name: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const clean = name.trim().slice(0, 80);
  if (!clean) return { error: 'Informe o nome do bloco.' };

  const setlistId = await setlistOf(ctx, blockId);
  if (!setlistId) return { error: 'Bloco não encontrado.' };

  const { error } = await ctx.supabase.from('blocks').update({ name: clean }).eq('id', blockId);
  if (error) return { error: 'Não foi possível renomear o bloco.' };

  await refresh(ctx, setlistId);
  return { success: true };
}

export async function deleteBlock(blockId: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const setlistId = await setlistOf(ctx, blockId);
  if (!setlistId) return { error: 'Bloco não encontrado.' };

  const { error } = await ctx.supabase.from('blocks').delete().eq('id', blockId);
  if (error) return { error: 'Não foi possível remover o bloco.' };

  await refresh(ctx, setlistId);
  return { success: true };
}

/** Swaps a block with its neighbour ('up' or 'down'). */
export async function moveBlock(blockId: string, direction: 'up' | 'down') {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const setlistId = await setlistOf(ctx, blockId);
  if (!setlistId) return { error: 'Bloco não encontrado.' };

  const { data: blocks } = await ctx.supabase.from('blocks').select('id, position').eq('setlist_id', setlistId).order('position');
  const list = blocks ?? [];
  const i = list.findIndex((b) => b.id === blockId);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { success: true };

  // renumber so positions stay unique even if they had gaps
  const order = list.map((b) => b.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((id, position) => ctx.supabase.from('blocks').update({ position }).eq('id', id)));

  await refresh(ctx, setlistId);
  return { success: true };
}

export async function addSongToBlock(blockId: string, songId: string, requestedKey: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const setlistId = await setlistOf(ctx, blockId);
  if (!setlistId) return { error: 'Bloco não encontrado.' };

  const { data: song } = await ctx.supabase.from('songs').select('id, original_key').eq('id', songId).eq('band_id', ctx.bandId).maybeSingle();
  if (!song) return { error: 'Música não encontrada no catálogo da banda.' };

  const { data: last } = await ctx.supabase.from('block_songs').select('position').eq('block_id', blockId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { error } = await ctx.supabase.from('block_songs').insert({
    block_id: blockId,
    song_id: songId,
    reference_key: song.original_key,
    requested_key: requestedKey.trim() || song.original_key,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { error: 'Não foi possível adicionar a música.' };

  await refresh(ctx, setlistId);
  return { success: true };
}

export async function updateBlockSong(id: string, fields: { requested_key: string; note: string; transition_note: string }) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: item } = await ctx.supabase.from('block_songs').select('block_id').eq('id', id).maybeSingle();
  const setlistId = item ? await setlistOf(ctx, item.block_id) : null;
  if (!setlistId) return { error: 'Item não encontrado.' };

  const { error } = await ctx.supabase
    .from('block_songs')
    .update({
      requested_key: fields.requested_key.trim() || null,
      note: fields.note.trim() || null,
      transition_note: fields.transition_note.trim() || null,
    })
    .eq('id', id);
  if (error) return { error: 'Não foi possível salvar.' };

  await refresh(ctx, setlistId);
  return { success: true };
}

export async function removeBlockSong(id: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: item } = await ctx.supabase.from('block_songs').select('block_id').eq('id', id).maybeSingle();
  const setlistId = item ? await setlistOf(ctx, item.block_id) : null;
  if (!setlistId) return { error: 'Item não encontrado.' };

  const { error } = await ctx.supabase.from('block_songs').delete().eq('id', id);
  if (error) return { error: 'Não foi possível remover.' };

  await refresh(ctx, setlistId);
  return { success: true };
}

export async function moveBlockSong(id: string, direction: 'up' | 'down') {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: item } = await ctx.supabase.from('block_songs').select('block_id').eq('id', id).maybeSingle();
  if (!item) return { error: 'Item não encontrado.' };
  const setlistId = await setlistOf(ctx, item.block_id);
  if (!setlistId) return { error: 'Item não encontrado.' };

  const { data: items } = await ctx.supabase.from('block_songs').select('id, position').eq('block_id', item.block_id).order('position');
  const list = items ?? [];
  const i = list.findIndex((x) => x.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { success: true };

  const order = list.map((x) => x.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((rowId, position) => ctx.supabase.from('block_songs').update({ position }).eq('id', rowId)));

  await refresh(ctx, setlistId);
  return { success: true };
}

/** Creates (or returns the active) read-only public link. The token is only ever read on the server. */
export async function createShareLink(setlistId: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: own } = await ctx.supabase.from('setlists').select('id').eq('id', setlistId).eq('band_id', ctx.bandId).maybeSingle();
  if (!own) return { error: 'Repertório não encontrado.' };

  const admin = createAdminClient();
  const { data: existing } = await admin.from('setlist_share_links').select('token').eq('setlist_id', setlistId).is('revoked_at', null).limit(1).maybeSingle();
  if (existing) return { token: existing.token };

  const { data, error } = await admin.from('setlist_share_links').insert({ setlist_id: setlistId }).select('token').single();
  if (error || !data) return { error: 'Não foi possível criar o link.' };

  await refresh(ctx, setlistId);
  return { token: data.token };
}

export async function revokeShareLink(setlistId: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: own } = await ctx.supabase.from('setlists').select('id').eq('id', setlistId).eq('band_id', ctx.bandId).maybeSingle();
  if (!own) return { error: 'Repertório não encontrado.' };

  const { error } = await createAdminClient()
    .from('setlist_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('setlist_id', setlistId)
    .is('revoked_at', null);
  if (error) return { error: 'Não foi possível revogar o link.' };

  await refresh(ctx, setlistId);
  return { success: true };
}
