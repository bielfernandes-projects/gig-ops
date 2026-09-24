'use server';

import { revalidatePath } from 'next/cache';
import { bandOf, requireBand, requireBandFor, requireOwner, requireOwnerFor } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { PDF_BUCKET } from './song-actions';

type Ctx = Extract<Awaited<ReturnType<typeof requireBand>>, { ok: true }>;
type SetlistRow = { id: string; scope: 'band' | 'personal'; owner_user_id: string | null; band_id: string };

/** Band setlists are edited by band owners; personal ones only by the person who created them. */
async function editableSetlist(ctx: Ctx, setlistId: string): Promise<SetlistRow | null> {
  const { data } = await ctx.supabase
    .from('setlists')
    .select('id, scope, owner_user_id, band_id')
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

/** Revalidates every gig currently using this setlist (a setlist can now be shared by several). */
async function refresh(ctx: Pick<Ctx, 'supabase'>, sl: Pick<SetlistRow, 'id'>) {
  const { data: gigs } = await ctx.supabase.from('go_gigs').select('id').eq('setlist_id', sl.id);
  for (const g of gigs ?? []) revalidatePath(`/gigs/${g.id}`);
  revalidatePath('/repertorio');
  revalidatePath(`/repertorio/lista/${sl.id}`);
}

const NO_PERMISSION = { error: 'Você não tem permissão para editar este repertório.' };

// Band of a block / block item, so edits work from the "Todas as bandas" view too.
type SetlistRef = { band_id: string } | { band_id: string }[] | null | undefined;
const one = (r: SetlistRef) => (Array.isArray(r) ? r[0]?.band_id : r?.band_id) ?? null;

async function blockBand(blockId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('blocks').select('setlists!inner(band_id)').eq('id', blockId).maybeSingle();
  return one(data?.setlists as SetlistRef);
}

async function itemBand(itemId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('block_songs').select('block_id').eq('id', itemId).maybeSingle();
  return data ? blockBand(data.block_id) : null;
}

/** A reusable band setlist (library): created empty, then anexado a shows / marcado como principal. */
export async function createBandSetlist(name: string, bandId?: string | null) {
  const ctx = await requireOwner('repertorio', bandId);
  if (!ctx.ok) return { error: ctx.error };

  const clean = name.trim().slice(0, 80);
  if (!clean) return { error: 'Informe o nome do repertório.' };

  const { data: setlist, error } = await ctx.supabase
    .from('setlists')
    .insert({ band_id: ctx.bandId, name: clean, scope: 'band', created_by: ctx.userId })
    .select('id')
    .single();
  if (error || !setlist) return { error: 'Não foi possível criar o repertório.' };

  await ctx.supabase.from('blocks').insert({ setlist_id: setlist.id, name: 'Bloco 1', position: 0 });

  revalidatePath('/repertorio');
  return { success: true, id: setlist.id };
}

/** A personal setlist only its creator sees (any member of the band can have them). */
/** Personal setlists still hang off a band (its catalog is what they can use). */
export async function createPersonalSetlist(name: string, bandId?: string | null) {
  const ctx = await requireBand('repertorio', bandId);
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

  revalidatePath('/repertorio');
  return { success: true, id: setlist.id };
}

export async function deleteSetlist(setlistId: string) {
  const ctx = await requireBand('repertorio', await bandOf('setlists', setlistId));
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableSetlist(ctx, setlistId);
  if (!sl) return NO_PERMISSION;

  const { data, error } = await ctx.supabase.from('setlists').delete().eq('id', setlistId).select('id');
  if (error || !data?.length) return { error: 'Não foi possível remover o repertório.' };

  await refresh(ctx, sl);
  return { success: true };
}

export async function addBlock(setlistId: string, name: string) {
  const ctx = await requireBand('repertorio', await bandOf('setlists', setlistId));
  if (!ctx.ok) return { error: ctx.error };

  const clean = name.trim().slice(0, 80);
  if (!clean) return { error: 'Informe o nome do bloco.' };

  const sl = await editableSetlist(ctx, setlistId);
  if (!sl) return NO_PERMISSION;

  const { data: last } = await ctx.supabase.from('blocks').select('position').eq('setlist_id', setlistId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { error } = await ctx.supabase.from('blocks').insert({ setlist_id: setlistId, name: clean, position: (last?.position ?? -1) + 1 });
  if (error) return { error: 'Não foi possível criar o bloco.' };

  await refresh(ctx, sl);
  return { success: true };
}

export async function renameBlock(blockId: string, name: string) {
  const ctx = await requireBand('repertorio', await blockBand(blockId));
  if (!ctx.ok) return { error: ctx.error };

  const clean = name.trim().slice(0, 80);
  if (!clean) return { error: 'Informe o nome do bloco.' };

  const sl = await editableBlock(ctx, blockId);
  if (!sl) return NO_PERMISSION;

  const { data, error } = await ctx.supabase.from('blocks').update({ name: clean }).eq('id', blockId).select('id');
  if (error || !data?.length) return { error: 'Não foi possível renomear o bloco.' };

  await refresh(ctx, sl);
  return { success: true };
}

export async function deleteBlock(blockId: string) {
  const ctx = await requireBand('repertorio', await blockBand(blockId));
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableBlock(ctx, blockId);
  if (!sl) return NO_PERMISSION;

  const { data, error } = await ctx.supabase.from('blocks').delete().eq('id', blockId).select('id');
  if (error || !data?.length) return { error: 'Não foi possível remover o bloco.' };

  await refresh(ctx, sl);
  return { success: true };
}

/** Swaps a block with its neighbour ('up' or 'down'). */
export async function moveBlock(blockId: string, direction: 'up' | 'down') {
  const ctx = await requireBand('repertorio', await blockBand(blockId));
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

  await refresh(ctx, sl);
  return { success: true };
}

export async function addSongToBlock(blockId: string, songId: string, requestedKey: string) {
  const ctx = await requireBand('repertorio', await blockBand(blockId));
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

  await refresh(ctx, sl);
  return { success: true };
}

export async function updateBlockSong(id: string, fields: { requested_key: string; note: string; transition_note: string }) {
  const ctx = await requireBand('repertorio', await itemBand(id));
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

  await refresh(ctx, item.sl);
  return { success: true };
}

export async function removeBlockSong(id: string) {
  const ctx = await requireBand('repertorio', await itemBand(id));
  if (!ctx.ok) return { error: ctx.error };

  const item = await editableItem(ctx, id);
  if (!item) return NO_PERMISSION;

  const { data, error } = await ctx.supabase.from('block_songs').delete().eq('id', id).select('id');
  if (error || !data?.length) return { error: 'Não foi possível remover.' };

  await refresh(ctx, item.sl);
  return { success: true };
}

export async function moveBlockSong(id: string, direction: 'up' | 'down') {
  const ctx = await requireBand('repertorio', await itemBand(id));
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

  await refresh(ctx, item.sl);
  return { success: true };
}

/** Attaches an existing band setlist to a gig (the gig's owner picks from the band's library). */
export async function attachSetlistToGig(gigId: string, setlistId: string) {
  const ctx = await requireOwnerFor('go_gigs', gigId, 'repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: setlist } = await ctx.supabase.from('setlists').select('id, band_id, scope').eq('id', setlistId).maybeSingle();
  if (!setlist || setlist.band_id !== ctx.bandId || setlist.scope !== 'band') return { error: 'Repertório não encontrado.' };

  const { error } = await ctx.supabase.from('go_gigs').update({ setlist_id: setlistId }).eq('id', gigId);
  if (error) return { error: 'Não foi possível anexar o repertório.' };

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath(`/repertorio/lista/${setlistId}`);
  return { success: true };
}

export async function detachSetlistFromGig(gigId: string) {
  const ctx = await requireOwnerFor('go_gigs', gigId, 'repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase.from('go_gigs').update({ setlist_id: null }).eq('id', gigId);
  if (error) return { error: 'Não foi possível desanexar o repertório.' };

  revalidatePath(`/gigs/${gigId}`);
  return { success: true };
}

type SourceSetlist = {
  id: string;
  name: string;
  band_id: string;
  scope: 'band' | 'personal';
  blocks: {
    id: string;
    name: string;
    theme: string | null;
    position: number;
    block_songs: { song_id: string; reference_key: string | null; requested_key: string | null; note: string | null; transition_note: string | null; position: number }[];
  }[];
};

/** Forks a shared setlist into an independent copy, attached only to this gig. */
export async function duplicateSetlistForGig(gigId: string, setlistId: string) {
  const ctx = await requireOwnerFor('go_gigs', gigId, 'repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data: source } = (await ctx.supabase
    .from('setlists')
    .select('id, name, band_id, scope, blocks(id, name, theme, position, block_songs(song_id, reference_key, requested_key, note, transition_note, position))')
    .eq('id', setlistId)
    .maybeSingle()) as unknown as { data: SourceSetlist | null };
  if (!source || source.band_id !== ctx.bandId || source.scope !== 'band') return { error: 'Repertório não encontrado.' };

  const { data: copy, error } = await ctx.supabase
    .from('setlists')
    .insert({ band_id: ctx.bandId, name: source.name, scope: 'band', created_by: ctx.userId })
    .select('id')
    .single();
  if (error || !copy) return { error: 'Não foi possível duplicar o repertório.' };

  const newBlocks = await Promise.all(
    source.blocks.map((block) =>
      ctx.supabase.from('blocks').insert({ setlist_id: copy.id, name: block.name, theme: block.theme, position: block.position }).select('id').single()
    )
  );

  const allBlockSongs = source.blocks.flatMap((block, i) => {
    const newBlockId = newBlocks[i].data?.id;
    if (!newBlockId) return [];
    return block.block_songs.map((bs) => ({
      block_id: newBlockId,
      song_id: bs.song_id,
      reference_key: bs.reference_key,
      requested_key: bs.requested_key,
      note: bs.note,
      transition_note: bs.transition_note,
      position: bs.position,
    }));
  });
  if (allBlockSongs.length > 0) await ctx.supabase.from('block_songs').insert(allBlockSongs);

  await ctx.supabase.from('go_gigs').update({ setlist_id: copy.id }).eq('id', gigId);

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath('/repertorio');
  return { success: true, id: copy.id };
}

/** Marks a band setlist as the one new gigs auto-attach to (at most one per band). */
export async function setDefaultSetlist(setlistId: string) {
  const ctx = await requireOwnerFor('setlists', setlistId, 'repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase.rpc('set_default_setlist', { target_id: setlistId });
  if (error) return { error: 'Não foi possível marcar como principal.' };

  revalidatePath('/repertorio');
  return { success: true };
}

/** Creates (or returns the active) read-only public link. The token is only ever read on the server. */
export async function createShareLink(setlistId: string) {
  const ctx = await requireBand('repertorio', await bandOf('setlists', setlistId));
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableSetlist(ctx, setlistId);
  if (!sl) return NO_PERMISSION;

  const admin = createAdminClient();
  const { data: existing } = await admin.from('setlist_share_links').select('token').eq('setlist_id', setlistId).is('revoked_at', null).limit(1).maybeSingle();
  if (existing) return { token: existing.token };

  const { data, error } = await admin.from('setlist_share_links').insert({ setlist_id: setlistId }).select('token').single();
  if (error || !data) return { error: 'Não foi possível criar o link.' };

  await refresh(ctx, sl);
  return { token: data.token };
}

export async function revokeShareLink(setlistId: string) {
  const ctx = await requireBand('repertorio', await bandOf('setlists', setlistId));
  if (!ctx.ok) return { error: ctx.error };

  const sl = await editableSetlist(ctx, setlistId);
  if (!sl) return NO_PERMISSION;

  const { error } = await createAdminClient()
    .from('setlist_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('setlist_id', setlistId)
    .is('revoked_at', null);
  if (error) return { error: 'Não foi possível revogar o link.' };

  await refresh(ctx, sl);
  return { success: true };
}

/**
 * Signed PDF URL for the public (no-login) setlist view: validates via the share token instead
 * of band membership, and only for a song that's actually in a block of that shared setlist —
 * never an arbitrary songId.
 */
export async function getPublicSongPdfUrl(token: string, songId: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: 'Link inválido.' };

  const admin = createAdminClient();
  const { data: link } = await admin.from('setlist_share_links').select('setlist_id').eq('token', token).is('revoked_at', null).maybeSingle();
  if (!link) return { error: 'Link inválido.' };

  const { data: match } = await admin
    .from('block_songs')
    .select('id, blocks!inner(setlist_id)')
    .eq('song_id', songId)
    .eq('blocks.setlist_id', link.setlist_id)
    .limit(1)
    .maybeSingle();
  if (!match) return { error: 'Música não encontrada neste repertório.' };

  const { data, error } = await admin.storage.from(PDF_BUCKET).createSignedUrl(`${songId}.pdf`, 300);
  if (error || !data) return { error: 'Não foi possível abrir o PDF.' };
  return { url: data.signedUrl };
}
