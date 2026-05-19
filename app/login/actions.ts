'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { sendPushToAdmins } from '@/app/actions/push-actions';

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

  // Validate invite code (find which admin owns this code)
  const { data: settingsData } = await supabase
    .from('go_settings')
    .select('admin_id')
    .eq('invite_code', inviteCode.toUpperCase())
    .maybeSingle();

  if (!settingsData) {
    return { error: 'Código de convite inválido.' };
  }

  const adminId = settingsData.admin_id;
  const origin = formData.get('origin') as string || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/login`
    }
  });

  if (error) {
    return { error: error.message };
  }

  // Link the new user's profile to the admin who owns this invite code
  if (data.user) {
    const { error: profileError } = await supabase
      .from('go_profiles')
      .upsert({ id: data.user.id, invited_by: adminId }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error linking profile to admin:', profileError);
    }
  }

  // Notify admins of new registration (fire & forget — never blocks signup)
  try {
    await sendPushToAdmins({
      title: 'Novo Músico Registado! 🎸',
      body: 'Um novo membro acabou de se registar na plataforma.',
    });
  } catch (e) {
    console.warn('Admin push notification failed silently after signup:', e);
  }

  return { success: true };
}

export async function adminSignup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const origin = formData.get('origin') as string || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/login`
    }
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: 'Erro ao criar usuário.' };

  // Create or update profile with admin role (trigger may already create a row)
  const { error: profileError } = await supabase
    .from('go_profiles')
    .upsert({ id: data.user.id, role: 'admin', email }, { onConflict: 'id' });

  if (profileError) {
    console.error('Error creating admin profile:', profileError);
    // Rollback is not feasible here (auth user already created)
    return { error: 'Conta criada, mas houve um erro ao configurar perfil. Entre em contato com o suporte.' };
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
