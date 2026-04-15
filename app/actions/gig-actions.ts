'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function addQuickGig(formData: FormData) {
  const title = formData.get('title') as string;
  const project_id = formData.get('project_id') as string;
  const date = formData.get('date') as string;
  const grossValueStr = formData.get('gross_value') as string;
  
  if (!title || !project_id || !date) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const gross_value = parseFloat(grossValueStr) || 0;

  const { error } = await supabase
    .from('go_gigs')
    .insert([
      { 
        title, 
        project_id, 
        date, 
        gross_value,
        location: 'A definir', // Evita erro se o banco exigir location NOT NULL
      }
    ]);

  if (error) {
    console.error('Error inserting gig:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
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
