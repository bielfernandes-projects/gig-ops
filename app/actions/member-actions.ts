'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserInfo } from '@/lib/auth';

export async function addMember(formData: FormData) {
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

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

  const insertData: any = { name, instrument, phone: phone || null, email };
  
  // NOVO: Salvar admin_id se for admin
  if (role === 'admin' && userId) {
    insertData.admin_id = userId;
  }

  const { error } = await supabase
    .from('go_members')
    .insert([insertData]);

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
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

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

  let query = supabase
    .from('go_members')
    .update({ name, instrument, phone: phone || null, email })
    .eq('id', id);

  // NOVO: Filtrar por admin_id se for admin
  if (role === 'admin' && userId) {
    query = query.eq('admin_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error updating member:', error);
    return { error: error.message };
  }

  revalidatePath('/members');
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}
