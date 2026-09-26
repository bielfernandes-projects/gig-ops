'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getUserInfo } from '@/lib/auth';
import { ADMIN_COOKIE, isSuperAdmin, signElevation } from '@/lib/admin';

/**
 * Confere a senha de novo pra liberar o painel. A senha é validada contra o Supabase (onde está com
 * hash) por um cliente **descartável**: `persistSession: false` e nenhum cookie, então a sessão de
 * quem está navegando não é tocada — só queremos a resposta "essa senha é a dessa conta?".
 */
export async function elevate(formData: FormData) {
  const info = await getUserInfo();
  if (!info.userId || !info.email || !isSuperAdmin(info.email)) return { error: 'Sem permissão.' };

  const password = String(formData.get('password') ?? '');
  if (!password) return { error: 'Informe a senha.' };

  const probe = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await probe.auth.signInWithPassword({ email: info.email, password });
  if (error) return { error: 'Senha incorreta.' };

  const token = signElevation(info.userId);
  if (!token) {
    console.error('admin: ADMIN_SESSION_SECRET não configurada (mínimo 16 caracteres).');
    return { error: 'Painel não configurado no servidor.' };
  }

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    // Sem maxAge de propósito: é cookie de sessão, morre quando o navegador fecha. O prazo de
    // verdade está assinado dentro do token (ELEVATION_MINUTES), pra quem nunca fecha o navegador.
  });

  redirect('/admin');
}

/** "Sair do painel": derruba a elevação sem mexer na sessão do app. */
export async function lockAdmin() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: '/admin' });
  redirect('/admin/entrar');
}
