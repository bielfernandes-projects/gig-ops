'use server';

import { requireOwner } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function addProject(formData: FormData) {
  const ctx = await requireOwner();
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const name = formData.get('name') as string;
  const color_hex = formData.get('color_hex') as string;

  if (!name || !color_hex) {
    return { error: 'Campos nome e cor são obrigatórios.' };
  }

  const { error } = await supabase
    .from('go_projects')
    .insert([{ name, color_hex, band_id: bandId }]);

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
  const ctx = await requireOwner();
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

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
    .eq('band_id', bandId);

  if (error) {
    console.error('Error updating project:', error);
    return { error: error.message };
  }

  revalidatePath('/projects');
  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true };
}
