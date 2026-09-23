'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createBandFor, joinBandByCode } from '@/lib/bands';
import { sendPushToBandOwners } from '@/lib/push';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error('Login error:', error.message, error.status);
    return { error: `[${error.status}] ${error.message}` };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

/** Sign-up of a musician invited by a band (invite code). */
export async function signup(formData: FormData) {
  const supabase = await createClient();

  const inviteCode = ((formData.get('inviteCode') as string) || '').trim().toUpperCase();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validate the invite code before creating the account
  const { data: band } = await createAdminClient().from('bands').select('id').eq('invite_code', inviteCode).maybeSingle();
  if (!band) {
    return { error: 'Código de convite inválido.' };
  }

  const origin = (formData.get('origin') as string) || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/login`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const joined = await joinBandByCode(data.user.id, inviteCode);
    if ('error' in joined) {
      console.error('Error joining band after signup:', joined.error);
      return { error: 'Conta criada, mas não foi possível entrar na banda. Use o código de convite em Perfil.' };
    }

    // Notify the band owners (fire & forget: never blocks signup)
    try {
      await sendPushToBandOwners(joined.bandId, {
        title: 'Novo músico na banda',
        body: 'Um novo membro acabou de entrar usando o código de convite.',
      });
    } catch (e) {
      console.warn('Owner push notification failed silently after signup:', e);
    }
  }

  return { success: true };
}

/** Sign-up of someone who creates their own band. */
export async function adminSignup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const bandName = ((formData.get('bandName') as string) || '').trim();
  const origin = (formData.get('origin') as string) || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/login`,
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: 'Erro ao criar usuário.' };

  const created = await createBandFor(data.user.id, bandName);
  if ('error' in created) {
    // The auth user already exists; onboarding lets them finish creating the band on first login.
    return { error: 'Conta criada, mas houve um erro ao criar a banda. Entre e crie a banda pelo Perfil.' };
  }

  return { success: true };
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const origin = (formData.get('origin') as string) || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    return { error: 'Não foi possível enviar o link de recuperação. Verifique o e-mail e tente novamente.' };
  }

  return { success: true };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
