'use server';

import { revalidatePath } from 'next/cache';
import { requireBand, requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type Ctx = Extract<Awaited<ReturnType<typeof requireBand>>, { ok: true }>;
type SetlistRow = { id: string; scope: 'band' | 'personal'; owner_user_id: string | null; band_id: string; gig_id: string | null };

/** Band setlists are edited by band owners; personal ones only by the person who created them. */
async function editableSetlist(ctx: Ctx, setlistId: string): Promise<SetlistRow | null> {
  const { data } = await ctx.supabase
    .from('setlists')
    .select('id, scope, owner_user_id, band_id, gig_id')
    .eq('id', setlistId)
    .maybeSingle();
  const sl = data as SetlistRow | null;
  if (!sl) return null;
  const allowed = sl.scope === 'personal' ? sl.owner_user_id === ctx.userId : ctx.role === 'owner' && sl.band_id === ctx.bandId;
  return allowed ? sl : null;
}

async function editableBlock(ctx: Ctx, blockId: string): Promise<SetlistRow | null> {
  const { data } = await ctx.supabase.from('blocks').select('setlist_id').eq('id', blockId).maybeSingle();
  return data ? editableSetlist(ctx, data.setlist_id) : null;
}

async function editableItem(ctx: Ctx, itemId: string): Promise<{ sl: SetlistRow; blockId: string } | null> {
  const { data } = await ctx.supabase.from('block_songs').select('block_id').eq('id', itemId).maybeSingle();
  if (!data) return null;
  const sl = await editableBlock(ctx, data.block_id);
  return sl ? { sl, blockId: data.block_id } : null;
}

function refresh(sl: Pick<SetlistRow, 'id' | 'gig_id'>) {
  if (sl.gig_id) revalidatePath(`/gigs/${sl.gig_id}`);
  revalidatePath('/repertorio');
  revalidatePath(`/repertorio/lista/${sl.id}`);
}

const NO_PERMISSION = { error: 'Você não tem permissão para editar este repertório.' };

/** Official setlist of a gig: band owners only. */
export async function createGigSetlist(gigId: string) {
  const ctx = await requireOwner('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: gig } = await ctx.supabase.from('go_gigs').select('id, title').eq('id', gigId).eq('band_id', ctx.bandId).maybeSingle();
  if (!gig) return { error: 'Show não encontrado.' };

  const { data: setlist, error } = await ctx.supabase
    .from('setlists')
    .insert({ band_id: ctx.bandId, gig_id: gigId, name: gig.title, created_by: ctx.userId, scope: 'band' })
    .select('id')
    .single();
  if (error || !setlist) return { error: 'Não foi possível criar o repertório (este show já tem um?).' };

  await ctx.supabase.from('blocks').insert({ setlist_id: setlist.id, name: 'Bloco 1', position: 0 });

  refresh({ id: setlist.id, gig_id: gigId });
  return { success: true };
}

/** A personal setlist only its creator sees (any member of the band can have them). */
export async function createPersonalSetlist(name: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const clean = name.trim().slice(0, 80);
  if (!clean) return { error: 'Informe o nome do repertório.' };

  const { data: setlist, error } = await ctx.supabase
    .from('setlists')
    .insert({ band_id: ctx.bandId, name: clean, scope: 'personal', owner_user_id: ctx.userId, created_by: ctx.userId })
    .select('id')
    .single();
  if (error || !setlist) return { error: 'Não foi possível criar o repertório.' };

  await ctx.supabase.from('blocks').insert({ setlist_id: setlist.id, name: 'Bloco 1', position: 0 });

  refresh({ id: setlist.id, gig_id: null });
  return { success: true, id: setlist.id };
}

export async function deleteSetlist(setlistId: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableSetlist(ctx, setlistId);
  if (!sl) return NO_PERMISSION;

  const { data, error } = await ctx.supabase.from('setlists').delete().eq('id', setlistId).select('id');
  if (error || !data?.length) return { error: 'Não foi possível remover o repertório.' };

  refresh(sl);
  return { success: true };
}

export async function addBlock(setlistId: string, name: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const clean = name.trim().slice(0, 80);
  if (!clean) return { error: 'Informe o nome do bloco.' };

  const sl = await editableSetlist(ctx, setlistId);
  if (!sl) return NO_PERMISSION;

  const { data: last } = await ctx.supabase.from('blocks').select('position').eq('setlist_id', setlistId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { error } = await ctx.supabase.from('blocks').insert({ setlist_id: setlistId, name: clean, position: (last?.position ?? -1) + 1 });
  if (error) return { error: 'Não foi possível criar o bloco.' };

  refresh(sl);
  return { success: true };
}

export async function renameBlock(blockId: string, name: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const clean = name.trim().slice(0, 80);
  if (!clean) return { error: 'Informe o nome do bloco.' };

  const sl = await editableBlock(ctx, blockId);
  if (!sl) return NO_PERMISSION;

  const { data, error } = await ctx.supabase.from('blocks').update({ name: clean }).eq('id', blockId).select('id');
  if (error || !data?.length) return { error: 'Não foi possível renomear o bloco.' };

  refresh(sl);
  return { success: true };
}

export async function deleteBlock(blockId: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableBlock(ctx, blockId);
  if (!sl) return NO_PERMISSION;

  const { data, error } = await ctx.supabase.from('blocks').delete().eq('id', blockId).select('id');
  if (error || !data?.length) return { error: 'Não foi possível remover o bloco.' };

  refresh(sl);
  return { success: true };
}

/** Swaps a block with its neighbour ('up' or 'down'). */
export async function moveBlock(blockId: string, direction: 'up' | 'down') {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableBlock(ctx, blockId);
  if (!sl) return NO_PERMISSION;

  const { data: blocks } = await ctx.supabase.from('blocks').select('id, position').eq('setlist_id', sl.id).order('position');
  const list = blocks ?? [];
  const i = list.findIndex((b) => b.id === blockId);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { success: true };

  // renumber so positions stay unique even if they had gaps
  const order = list.map((b) => b.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((id, position) => ctx.supabase.from('blocks').update({ position }).eq('id', id)));

  refresh(sl);
  return { success: true };
}

export async function addSongToBlock(blockId: string, songId: string, requestedKey: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableBlock(ctx, blockId);
  if (!sl) return NO_PERMISSION;

  const { data: song } = await ctx.supabase.from('songs').select('id, original_key, scope').eq('id', songId).eq('band_id', sl.band_id).maybeSingle();
  if (!song) return { error: 'Música não encontrada.' };
  if (sl.scope === 'band' && song.scope === 'personal') return { error: 'Músicas pessoais só entram em repertórios pessoais.' };

  const { data: last } = await ctx.supabase.from('block_songs').select('position').eq('block_id', blockId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { error } = await ctx.supabase.from('block_songs').insert({
    block_id: blockId,
    song_id: songId,
    reference_key: song.original_key,
    requested_key: requestedKey.trim() || song.original_key,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { error: 'Não foi possível adicionar a música.' };

  refresh(sl);
  return { success: true };
}

export async function updateBlockSong(id: string, fields: { requested_key: string; note: string; transition_note: string }) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const item = await editableItem(ctx, id);
  if (!item) return NO_PERMISSION;

  const { data, error } = await ctx.supabase
    .from('block_songs')
    .update({
      requested_key: fields.requested_key.trim() || null,
      note: fields.note.trim() || null,
      transition_note: fields.transition_note.trim() || null,
    })
    .eq('id', id)
    .select('id');
  if (error || !data?.length) return { error: 'Não foi possível salvar.' };

  refresh(item.sl);
  return { success: true };
}

export async function removeBlockSong(id: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const item = await editableItem(ctx, id);
  if (!item) return NO_PERMISSION;

  const { data, error } = await ctx.supabase.from('block_songs').delete().eq('id', id).select('id');
  if (error || !data?.length) return { error: 'Não foi possível remover.' };

  refresh(item.sl);
  return { success: true };
}

export async function moveBlockSong(id: string, direction: 'up' | 'down') {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const item = await editableItem(ctx, id);
  if (!item) return NO_PERMISSION;

  const { data: items } = await ctx.supabase.from('block_songs').select('id, position').eq('block_id', item.blockId).order('position');
  const list = items ?? [];
  const i = list.findIndex((x) => x.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { success: true };

  const order = list.map((x) => x.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((rowId, position) => ctx.supabase.from('block_songs').update({ position }).eq('id', rowId)));

  refresh(item.sl);
  return { success: true };
}

/** Creates (or returns the active) read-only public link. The token is only ever read on the server. */
export async function createShareLink(setlistId: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableSetlist(ctx, setlistId);
  if (!sl) return NO_PERMISSION;

  const admin = createAdminClient();
  const { data: existing } = await admin.from('setlist_share_links').select('token').eq('setlist_id', setlistId).is('revoked_at', null).limit(1).maybeSingle();
  if (existing) return { token: existing.token };

  const { data, error } = await admin.from('setlist_share_links').insert({ setlist_id: setlistId }).select('token').single();
  if (error || !data) return { error: 'Não foi possível criar o link.' };

  refresh(sl);
  return { token: data.token };
}

export async function revokeShareLink(setlistId: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableSetlist(ctx, setlistId);
  if (!sl) return NO_PERMISSION;

  const { error } = await createAdminClient()
    .from('setlist_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('setlist_id', setlistId)
    .is('revoked_at', null);
  if (error) return { error: 'Não foi possível revogar o link.' };

  refresh(sl);
  return { success: true };
}
