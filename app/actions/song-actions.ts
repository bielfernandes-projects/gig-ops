'use server';

import { revalidatePath } from 'next/cache';
import { requireBand } from '@/lib/auth';

function readSong(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const bpmRaw = String(formData.get('bpm') ?? '').trim();
  const bpm = bpmRaw ? parseInt(bpmRaw, 10) : null;
  const sourceUrl = String(formData.get('source_url') ?? '').trim() || null;

  return {
    title,
    artist: String(formData.get('artist') ?? '').trim() || null,
    original_key: String(formData.get('original_key') ?? '').trim() || null,
    bpm: bpm !== null && Number.isFinite(bpm) ? bpm : null,
    source_url: sourceUrl,
    chart_text: String(formData.get('chart_text') ?? '').replace(/\r\n/g, '\n') || null,
  };
}

function invalid(song: ReturnType<typeof readSong>): string | null {
  if (!song.title) return 'Informe o nome da música.';
  if (song.bpm !== null && (song.bpm < 1 || song.bpm > 400)) return 'BPM deve estar entre 1 e 400.';
  if (song.source_url && !/^https?:\/\//i.test(song.source_url)) return 'O link deve começar com http:// ou https://.';
  if (song.chart_text && song.chart_text.length > 60_000) return 'A cifra é grande demais.';
  return null;
}

/** Any band member can add songs to the band catalog. */
export async function addSong(formData: FormData) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const song = readSong(formData);
  const problem = invalid(song);
  if (problem) return { error: problem };

  // "Só eu vejo": a personal song, visible only to its creator (used in personal setlists)
  const personal = formData.get('scope') === 'personal';
  const { error } = await ctx.supabase.from('songs').insert({
    ...song,
    band_id: ctx.bandId,
    created_by: ctx.userId,
    scope: personal ? 'personal' : 'band',
    owner_user_id: personal ? ctx.userId : null,
  });
  if (error) return { error: 'Não foi possível salvar a música.' };

  revalidatePath('/repertorio');
  return { success: true };
}

/** Owners edit any song; other members edit the ones they created (enforced by RLS too). */
export async function updateSong(id: string, formData: FormData) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const song = readSong(formData);
  const problem = invalid(song);
  if (problem) return { error: problem };

  const { data, error } = await ctx.supabase
    .from('songs')
    .update({ ...song, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('band_id', ctx.bandId)
    .select('id');
  if (error || !data?.length) return { error: 'Você não pode editar esta música.' };

  revalidatePath('/repertorio');
  return { success: true };
}

export async function deleteSong(id: string) {
  const ctx = await requireBand('repertorio');
  if (!ctx.ok) return { error: ctx.error };

  const { data, error } = await ctx.supabase.from('songs').delete().eq('id', id).eq('band_id', ctx.bandId).select('id');
  if (error || !data?.length) return { error: 'Você não pode remover esta música.' };

  revalidatePath('/repertorio');
  return { success: true };
}
