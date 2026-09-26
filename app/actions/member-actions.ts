'use server';

import { requireOwner, requireOwnerFor } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/telemetry';

export async function addMember(formData: FormData) {
  const ctx = await requireOwner(undefined, formData.get('band_id') as string | null);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const name = formData.get('name') as string;
  const instrument = formData.get('instrument') as string;
  const emailRaw = formData.get('email') as string;
  let phone = formData.get('phone') as string;

  if (!name || !instrument) {
    return { error: 'Campos nome e instrumento são obrigatórios.' };
  }

  // Sanitize phone number (strip everything but numbers) if it exists
  if (phone) {
    phone = phone.replace(/\D/g, '');
  } else {
    phone = '';
  }

  const email = emailRaw ? emailRaw.trim() : null;

  const calendarToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32);

  const { error } = await supabase
    .from('go_members')
    .insert([{ name, instrument, phone: phone || null, email, band_id: bandId, calendar_token: calendarToken }]);

  if (error) {
    console.error('Error inserting member:', error);
    return { error: error.message };
  }

  await logAction('musico_cadastrado', ctx.userId, bandId);

  revalidatePath('/members');
  // Revalidate the gig detail pages where the lineup dropdown exists
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}

export async function updateMember(formData: FormData) {
  const ctx = await requireOwnerFor('go_members', formData.get('id') as string);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const instrument = formData.get('instrument') as string;
  const emailRaw = formData.get('email') as string;
  let phone = formData.get('phone') as string;

  if (!id || !name || !instrument) {
    return { error: 'Campos nome e instrumento são obrigatórios.' };
  }

  if (phone) {
    phone = phone.replace(/\D/g, '');
  } else {
    phone = '';
  }

  const email = emailRaw ? emailRaw.trim() : null;

  const { error } = await supabase
    .from('go_members')
    .update({ name, instrument, phone: phone || null, email })
    .eq('id', id)
    .eq('band_id', bandId);

  if (error) {
    console.error('Error updating member:', error);
    return { error: error.message };
  }

  revalidatePath('/members');
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}

export async function toggleMemberFixed(memberId: string, isFixed: boolean) {
  const ctx = await requireOwnerFor('go_members', memberId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const { error } = await supabase
    .from('go_members')
    .update({ is_fixed: isFixed })
    .eq('id', memberId)
    .eq('band_id', bandId);

  if (error) {
    console.error('Error toggling fixed member:', error);
    return { error: error.message };
  }

  revalidatePath('/members');
  revalidatePath('/agenda');
  return { success: true };
}

export async function deleteMember(memberId: string) {
  const ctx = await requireOwnerFor('go_members', memberId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  if (!memberId) return { error: 'ID do músico inválido.' };

  const { data: member, error: fetchError } = await supabase
    .from('go_members')
    .select('id, name')
    .eq('id', memberId)
    .eq('band_id', bandId)
    .single();

  if (fetchError || !member) return { error: 'Músico não encontrado.' };

  const { error } = await supabase
    .from('go_members')
    .delete()
    .eq('id', memberId)
    .eq('band_id', bandId);

  if (error) {
    console.error('Error deleting member:', error);
    return { error: error.message };
  }

  revalidatePath('/members');
  revalidatePath('/gigs/[id]', 'page');
  revalidatePath('/agenda');
  return { success: true };
}
