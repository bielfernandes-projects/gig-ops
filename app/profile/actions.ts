'use server';

import { createClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function saveInviteCode(formData: FormData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };

  const code = formData.get('inviteCode') as string;

  // Validate: max 5 chars, only letters and numbers
  if (!code || code.length > 5 || !/^[A-Za-z0-9]+$/.test(code)) {
    return { error: 'Código deve ter no máximo 5 caracteres alfanuméricos.' };
  }

  // Check uniqueness across all admins
  const { data: existing } = await supabase
    .from('go_settings')
    .select('admin_id')
    .eq('invite_code', code.toUpperCase())
    .maybeSingle();

  if (existing && existing.admin_id !== user.id) {
    return { error: 'Este código já está em uso por outro administrador.' };
  }

  const { error } = await supabase
    .from('go_settings')
    .upsert(
      { admin_id: user.id, invite_code: code.toUpperCase() },
      { onConflict: 'admin_id' }
    );

  if (error) {
    console.error('Error saving invite code:', error);
    return { error: 'Erro ao salvar código de convite.' };
  }

  revalidatePath('/profile');
  return { success: true };
}

export async function updateInvitedBy(formData: FormData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };

  const code = formData.get('inviteCode') as string;
  if (!code) return { error: 'Código de convite inválido.' };

  // Find admin with this invite code
  const { data: settingsData } = await supabase
    .from('go_settings')
    .select('admin_id')
    .eq('invite_code', code.toUpperCase())
    .maybeSingle();

  if (!settingsData) return { error: 'Código de convite inválido.' };

  // UPDATE the existing profile row. We use update (not upsert) because
  // go_profiles.email is NOT NULL — an upsert without email/role would
  // fail with a constraint violation. The profile row must exist for a
  // signed-in user (it's created by the Supabase auth trigger or signup).
  const { error: updateError } = await supabase
    .from('go_profiles')
    .update({ invited_by: settingsData.admin_id })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating invited_by:', updateError);
    // Fallback: if the row is missing entirely, do an upsert with all
    // required NOT NULL fields so the user can still recover.
    if (updateError.code === 'PGRST116') {
      const { error: upsertError } = await supabase
        .from('go_profiles')
        .upsert(
          { id: user.id, email: user.email ?? '', role: 'viewer', invited_by: settingsData.admin_id },
          { onConflict: 'id' }
        );
      if (upsertError) {
        console.error('Error upserting invited_by (fallback):', upsertError);
        return { error: 'Erro ao alterar banda.' };
      }
    } else {
      return { error: 'Erro ao alterar banda.' };
    }
  }

  revalidatePath('/profile');
  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  revalidatePath('/members');
  revalidatePath('/projects');
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    return { error: 'As senhas não coincidem.' };
  }

  if (password.length < 6) {
    return { error: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function removeProfile(id: string) {
  const supabase = await createClient();
  
  // Notice: This only removes the public profile. 
  // It effectively distances them from the app data logic without deleting Auth user if privileges are lacking.
  const { error } = await supabase
    .from('go_profiles')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/profile');
  return { success: true };
}
