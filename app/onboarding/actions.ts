'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToAdmins } from '@/lib/push';

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Google sign-ups start as viewers without a band: this makes the caller the admin of a new one. */
export async function createBand() {
  const user = await currentUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('go_profiles').select('invited_by').eq('id', user.id).maybeSingle();
  if (profile?.invited_by) return { error: 'Você já faz parte de uma banda.' };

  const { error } = await admin
    .from('go_profiles')
    .upsert({ id: user.id, email: user.email ?? '', role: 'admin' }, { onConflict: 'id' });
  if (error) return { error: 'Não foi possível criar sua banda. Tente novamente.' };

  await admin
    .from('go_settings')
    .upsert(
      { admin_id: user.id, calendar_token: crypto.randomUUID() },
      { onConflict: 'admin_id', ignoreDuplicates: true }
    );

  redirect('/dashboard');
}

/** Links the caller (as a musician) to the band that owns the invite code. */
export async function joinBand(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const code = String(formData.get('inviteCode') ?? '').trim().toUpperCase();
  if (!code) return { error: 'Informe o código de convite.' };

  const admin = createAdminClient();
  const { data: settings } = await admin.from('go_settings').select('admin_id').eq('invite_code', code).maybeSingle();
  if (!settings) return { error: 'Código de convite inválido.' };

  const { error } = await admin
    .from('go_profiles')
    .update({ invited_by: settings.admin_id, role: 'viewer' })
    .eq('id', user.id);
  if (error) return { error: 'Não foi possível entrar na banda. Tente novamente.' };

  await sendPushToAdmins(settings.admin_id, {
    title: 'Novo músico na banda 🎸',
    body: `${user.email ?? 'Um músico'} entrou usando o seu código de convite.`,
  });

  redirect('/dashboard');
}
