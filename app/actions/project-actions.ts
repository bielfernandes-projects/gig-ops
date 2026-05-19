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

export async function addProject(formData: FormData) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  const name = formData.get('name') as string;
  const color_hex = formData.get('color_hex') as string;

  if (!name || !color_hex) {
    return { error: 'Campos nome e cor são obrigatórios.' };
  }

  const { error } = await supabase
    .from('go_projects')
    .insert([{ name, color_hex, admin_id: adminId }]);

  if (error) {
    console.error('Error inserting project:', error);
    return { error: error.message };
  }

  revalidatePath('/projects');
  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateProject(formData: FormData) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const color_hex = formData.get('color_hex') as string;

  if (!id || !name || !color_hex) {
    return { error: 'Campos nome e cor são obrigatórios.' };
  }

  const { error } = await supabase
    .from('go_projects')
    .update({ name, color_hex })
    .eq('id', id)
    .eq('admin_id', adminId);

  if (error) {
    console.error('Error updating project:', error);
    return { error: error.message };
  }

  revalidatePath('/projects');
  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true };
}
