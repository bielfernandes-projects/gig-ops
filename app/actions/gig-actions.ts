'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPushToMember } from './push-actions';

export async function addQuickGig(formData: FormData) {
  const title = formData.get('title') as string;
  const project_id = formData.get('project_id') as string;
  const start_time = formData.get('start_time') as string;
  const end_time = (formData.get('end_time') as string) || null;
  const grossValueStr = formData.get('gross_value') as string;
  const notes = (formData.get('notes') as string) || null;
  
  if (!title || !project_id || !start_time) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const gross_value = parseFloat(grossValueStr) || 0;

  const { error } = await supabase
    .from('go_gigs')
    .insert([{ 
      title, 
      project_id, 
      start_time, 
      end_time,
      gross_value,
      location: 'A definir',
      bring_sound: false,
      sound_cost: 0,
      notes,
    }]);

  if (error) {
    console.error('Error inserting gig:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateGig(formData: FormData) {
  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const project_id = formData.get('project_id') as string;
  const start_time = formData.get('start_time') as string;
  const end_time = (formData.get('end_time') as string) || null;
  const location = formData.get('location') as string;
  const gross_value = parseFloat(formData.get('gross_value') as string) || 0;
  const bring_sound = formData.get('bring_sound') === 'true';
  const sound_cost = bring_sound ? (parseFloat(formData.get('sound_cost') as string) || 0) : 0;
  const rawSoundPerson = formData.get('sound_person_id') as string;
  const sound_person_id = bring_sound && rawSoundPerson ? rawSoundPerson : null;
  const notes = (formData.get('notes') as string) || null;

  if (!id || !title || !project_id || !start_time) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const { error } = await supabase
    .from('go_gigs')
    .update({ title, project_id, start_time, end_time, location, gross_value, bring_sound, sound_cost, sound_person_id, notes })
    .eq('id', id);

  if (error) {
    console.error('Error updating gig:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath(`/gigs/${id}`);
  return { success: true };
}

export async function deleteGig(gigId: string) {
  // Delete lineup entries first (FK cascade may handle this, but safer to be explicit)
  await supabase.from('go_lineup').delete().eq('gig_id', gigId);

  const { error } = await supabase
    .from('go_gigs')
    .delete()
    .eq('id', gigId);

  if (error) {
    console.error('Error deleting gig:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  redirect('/');
}

export async function addMemberToLineup(formData: FormData) {
  const gig_id = formData.get('gig_id') as string;
  const member_id = formData.get('musician_id') as string; // from select name
  const feeStr = formData.get('agreed_fee') as string; // from input name

  if (!gig_id || !member_id) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const fee_amount = parseFloat(feeStr) || 0;

  const { error } = await supabase
    .from('go_lineup')
    .insert([
      { gig_id, member_id, fee_amount, status: 'pendente' }
    ]);

  if (error) {
    console.error('Error adding member to lineup:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gig_id}`);

  // Fire push notification non-blocking (never breaks main flow)
  try {
    await sendPushToMember(member_id, {
      title: 'Nova Gig Escalada! 🎸',
      body: 'Você foi escalado para um novo show. Abra o app para ver os detalhes.',
      url: `/gigs/${gig_id}`,
    });
  } catch (e) {
    console.warn('Push notification failed silently:', e);
  }

  return { success: true };
}

export async function togglePaymentStatus(lineupId: string, targetIsPaid: boolean) {
  const newStatus = targetIsPaid ? 'pago' : 'pendente';
  
  const { error } = await supabase
    .from('go_lineup')
    .update({ status: newStatus })
    .eq('id', lineupId);

  if (error) {
    console.error('Error updating payment status:', error);
    return { error: error.message };
  }

  // Next.js App Router layout path dynamic revalidation rule
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}

export async function removeFromLineup(lineupId: string, gigId: string) {
  const { error } = await supabase
    .from('go_lineup')
    .delete()
    .eq('id', lineupId);

  if (error) {
    console.error('Error removing from lineup:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  return { success: true };
}

export async function updateLineupFee(formData: FormData) {
  const lineupId = formData.get('lineup_id') as string;
  const gigId = formData.get('gig_id') as string;
  const feeStr = formData.get('agreed_fee') as string;

  if (!lineupId || !gigId) {
    return { error: 'Dados inválidos.' };
  }

  const fee_amount = parseFloat(feeStr) || 0;

  const { error } = await supabase
    .from('go_lineup')
    .update({ fee_amount })
    .eq('id', lineupId);

  if (error) {
    console.error('Error updating lineup fee:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  return { success: true };
}
