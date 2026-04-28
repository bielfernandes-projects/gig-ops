'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserInfo } from '@/lib/auth';

export async function addProject(formData: FormData) {
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

  const name = formData.get('name') as string;
  const color_hex = formData.get('color_hex') as string;

  if (!name || !color_hex) {
    return { error: 'Campos nome e cor são obrigatórios.' };
  }

  const insertData: any = { name, color_hex };
  
  // NOVO: Salvar admin_id se for admin
  if (role === 'admin' && userId) {
    insertData.admin_id = userId;
  }

  const { error } = await supabase
    .from('go_projects')
    .insert([insertData]);

  if (error) {
    console.error('Error inserting project:', error);
    return { error: error.message };
  }

  revalidatePath('/projects');
  // Revalidate the home page so the dropdown updates in the QuickAddGig
  revalidatePath('/');
  return { success: true };
}

export async function updateProject(formData: FormData) {
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const color_hex = formData.get('color_hex') as string;

  if (!id || !name || !color_hex) {
    return { error: 'Campos nome e cor são obrigatórios.' };
  }

  let query = supabase
    .from('go_projects')
    .update({ name, color_hex })
    .eq('id', id);

  // NOVO: Filtrar por admin_id se for admin
  if (role === 'admin' && userId) {
    query = query.eq('admin_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error updating project:', error);
    return { error: error.message };
  }

  revalidatePath('/projects');
  revalidatePath('/');
  return { success: true };
}
