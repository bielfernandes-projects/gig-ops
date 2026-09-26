'use server';

import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/telemetry';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserInfo } from '@/lib/auth';
import { sendPushToBandOwners } from '@/lib/push';

/** A musician confirms or declines their own spot in a lineup. Owners get a push when someone declines. */
export async function setPresence(lineupId: string, status: 'confirmed' | 'declined' | 'pending') {
  const info = await getUserInfo();
  if (!info.userId) return { error: 'Não autenticado.' };

  const supabase = await createClient();
  const { data: row } = await supabase.from('go_lineup').select('id, gig_id, member_id').eq('id', lineupId).maybeSingle();
  if (!row?.member_id) return { error: 'Escala não encontrada.' };

  const { data: member } = await supabase.from('go_members').select('name, user_id, email').eq('id', row.member_id).maybeSingle();
  const isMe =
    !!member && (member.user_id === info.userId || (!!member.email && !!info.email && member.email.toLowerCase() === info.email.toLowerCase()));
  if (!isMe) return { error: 'Você só pode responder pela sua própria presença.' };

  const admin = createAdminClient();
  const { error } = await admin.from('go_lineup').update({ confirmation: status }).eq('id', lineupId);
  if (error) return { error: 'Não foi possível salvar sua resposta.' };

  if (status === 'declined') {
    const { data: gig } = await admin.from('go_gigs').select('title, band_id').eq('id', row.gig_id).maybeSingle();
    if (gig) {
      await sendPushToBandOwners(gig.band_id, {
        title: 'Presença recusada',
        body: `${member?.name ?? 'Um músico'} não poderá tocar em "${gig.title}".`,
        url: `/gigs/${row.gig_id}`,
      });
    }
  }

  if (status !== 'pending') {
    await logAction(status === 'confirmed' ? 'presenca_confirmada' : 'presenca_recusada', info.userId, info.bandId);
  }

  revalidatePath(`/gigs/${row.gig_id}`);
  revalidatePath('/agenda');
  return { success: true };
}
