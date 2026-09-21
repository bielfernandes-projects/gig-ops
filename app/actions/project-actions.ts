'use server';

import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function addProject(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Sem permissão.' };
  const { supabase, adminId } = admin;

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
  const admin = await requireAdmin();
  if (!admin) return { error: 'Sem permissão.' };
  const { supabase, adminId } = admin;

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
