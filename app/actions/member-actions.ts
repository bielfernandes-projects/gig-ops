'use server';

import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  return user.id;
}

export async function addMember(formData: FormData) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

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
    .insert([{ name, instrument, phone: phone || null, email, admin_id: adminId, calendar_token: calendarToken }]);

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
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

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
    .eq('admin_id', adminId);

  if (error) {
    console.error('Error updating member:', error);
    return { error: error.message };
  }

  revalidatePath('/members');
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}
