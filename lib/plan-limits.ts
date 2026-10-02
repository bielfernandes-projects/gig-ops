import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserInfo } from '@/lib/auth';
import { addSelfAsMember } from '@/lib/bands';
import { FREELA_LIMITS, setlistLimitMessage, songLimitMessage } from '@/lib/plans';

/** Server-side limits of a Freela account. A Banda has none of these, so every check returns null for it. */

export async function isFreelaBand(bandId: string): Promise<boolean> {
  return (await getUserInfo()).bands[bandId]?.kind === 'freela';
}

/** An error message when adding `adding` songs to the catalog would pass the Freela limit, otherwise null. */
export async function songLimitError(supabase: SupabaseClient, bandId: string, adding = 1): Promise<string | null> {
  if (!(await isFreelaBand(bandId))) return null;
  const { count } = await supabase.from('songs').select('id', { count: 'exact', head: true }).eq('band_id', bandId).eq('scope', 'band');
  return (count ?? 0) + adding > FREELA_LIMITS.songs ? songLimitMessage() : null;
}

/** Same for setlists (shared and personal ones both count). */
export async function setlistLimitError(supabase: SupabaseClient, bandId: string, adding = 1): Promise<string | null> {
  if (!(await isFreelaBand(bandId))) return null;
  const { count } = await supabase.from('setlists').select('id', { count: 'exact', head: true }).eq('band_id', bandId);
  return (count ?? 0) + adding > FREELA_LIMITS.setlists ? setlistLimitMessage() : null;
}

/**
 * The owner's own roster row in a Freela account (created on the spot for an account that was
 * reclassified as Freela). Every Freela gig is scheduled with it, with the gig's cachê as the fee.
 */
export const freelaSelfId = (bandId: string, userId: string) => addSelfAsMember(bandId, userId);
