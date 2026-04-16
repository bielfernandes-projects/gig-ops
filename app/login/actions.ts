'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: 'E-mail ou senha inválidos.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const inviteCode = formData.get('inviteCode') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validate invite code
  const { data: settingsData } = await supabase
    .from('go_settings')
    .select('invite_code')
    .single();

  if (!settingsData || settingsData.invite_code !== inviteCode) {
    return { error: 'Código de convite inválido.' };
  }

  const data = {
    email,
    password,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
