'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function addMember(formData: FormData) {
  const name = formData.get('name') as string;
  const instrument = formData.get('instrument') as string;
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

  const { error } = await supabase
    .from('go_members')
    .insert([{ name, instrument, phone: phone || null }]);

  if (error) {
    console.error('Error inserting member:', error);
    return { error: error.message };
  }

  revalidatePath('/members');
  // Revalidate the gig detail pages where the lineup dropdown exists
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}

export async function updateMember(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const instrument = formData.get('instrument') as string;
  let phone = formData.get('phone') as string;

  if (!id || !name || !instrument) {
    return { error: 'Campos nome e instrumento são obrigatórios.' };
  }

  if (phone) {
    phone = phone.replace(/\D/g, '');
  } else {
    phone = '';
  }

  const { error } = await supabase
    .from('go_members')
    .update({ name, instrument, phone: phone || null })
    .eq('id', id);

  if (error) {
    console.error('Error updating member:', error);
    return { error: error.message };
  }

  revalidatePath('/members');
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}
