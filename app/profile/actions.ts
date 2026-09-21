'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BAND_COOKIE, getUserInfo, requireOwner } from '@/lib/auth';
import { createBandFor, joinBandByCode } from '@/lib/bands';
import { sendPushToBandOwners } from '@/lib/push';

const revalidateAll = () => revalidatePath('/', 'layout');

async function rememberBand(bandId: string) {
  (await cookies()).set(BAND_COOKIE, bandId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

/** Name shown instead of the e-mail (empty clears it). Written with the service role: the profile row is otherwise read-only for the browser. */
export async function setDisplayName(name: string) {
  const info = await getUserInfo();
  if (!info.userId) return { error: 'Não autenticado.' };
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length > 40) return { error: 'Use até 40 caracteres.' };

  const { error } = await createAdminClient().from('go_profiles').update({ display_name: clean || null }).eq('id', info.userId);
  if (error) return { error: 'Não foi possível salvar o nome.' };

  revalidateAll();
  return { success: true };
}

/** Switch the band the user is working in (must be one they belong to). */
export async function switchBand(bandId: string) {
  const info = await getUserInfo();
  if (!info.userId) return { error: 'Não autenticado.' };
  if (!info.memberships.some((m) => m.bandId === bandId)) return { error: 'Você não faz parte desta banda.' };

  await rememberBand(bandId);
  revalidateAll();
  return { success: true };
}

/** Creates an additional band for the current user (they become its owner). */
export async function createAnotherBand(formData: FormData) {
  const info = await getUserInfo();
  if (!info.userId) return { error: 'Não autenticado.' };

  const created = await createBandFor(info.userId, String(formData.get('bandName') ?? ''));
  if ('error' in created) return { error: created.error };

  await rememberBand(created.bandId);
  revalidateAll();
  return { success: true };
}

/** Joins another band with its invite code (the user keeps the bands they already belong to). */
export async function joinAnotherBand(formData: FormData) {
  const info = await getUserInfo();
  if (!info.userId) return { error: 'Não autenticado.' };

  const joined = await joinBandByCode(info.userId, String(formData.get('inviteCode') ?? ''));
  if ('error' in joined) return { error: joined.error };

  await sendPushToBandOwners(joined.bandId, {
    title: 'Novo músico na banda',
    body: `${info.email ?? 'Um músico'} entrou usando o código de convite.`,
  });

  await rememberBand(joined.bandId);
  revalidateAll();
  return { success: true };
}

export async function renameBand(formData: FormData) {
  const ctx = await requireOwner();
  if (!ctx.ok) return { error: ctx.error };

  const name = String(formData.get('bandName') ?? '').trim().slice(0, 60);
  if (!name) return { error: 'Informe o nome da banda.' };

  const { error } = await ctx.supabase.from('bands').update({ name }).eq('id', ctx.bandId);
  if (error) return { error: 'Erro ao renomear a banda.' };

  revalidateAll();
  return { success: true };
}

export async function saveInviteCode(formData: FormData) {
  const ctx = await requireOwner();
  if (!ctx.ok) return { error: ctx.error };

  const code = String(formData.get('inviteCode') ?? '');

  // Validate: max 5 chars, only letters and numbers
  if (!code || code.length > 5 || !/^[A-Za-z0-9]+$/.test(code)) {
    return { error: 'Código deve ter no máximo 5 caracteres alfanuméricos.' };
  }

  // Uniqueness across all bands needs the service role (RLS hides other bands)
  const admin = createAdminClient();
  const { data: existing } = await admin.from('bands').select('id').eq('invite_code', code.toUpperCase()).maybeSingle();
  if (existing && existing.id !== ctx.bandId) {
    return { error: 'Este código já está em uso por outra banda.' };
  }

  const { error } = await ctx.supabase.from('bands').update({ invite_code: code.toUpperCase() }).eq('id', ctx.bandId);
  if (error) {
    console.error('Error saving invite code:', error);
    return { error: 'Erro ao salvar código de convite.' };
  }

  revalidatePath('/profile');
  return { success: true };
}

/** Owners can promote a member to owner (same rights) or demote another owner, keeping at least one owner. */
export async function setMemberRole(userId: string, role: 'owner' | 'member') {
  const ctx = await requireOwner();
  if (!ctx.ok) return { error: ctx.error };

  const admin = createAdminClient();
  const { data: owners } = await admin.from('band_members').select('user_id').eq('band_id', ctx.bandId).eq('role', 'owner');
  const others = (owners ?? []).filter((o) => o.user_id !== userId);
  if (role === 'member' && others.length === 0) return { error: 'A banda precisa ter pelo menos um dono.' };

  const { error } = await admin.from('band_members').update({ role }).eq('band_id', ctx.bandId).eq('user_id', userId);
  if (error) return { error: 'Não foi possível alterar o papel.' };

  revalidatePath('/profile');
  return { success: true };
}

/** Percentage of the band's profit an owner receives in the report (null = split equally with the others). */
export async function setProfitShare(userId: string, percent: number | null) {
  const ctx = await requireOwner();
  if (!ctx.ok) return { error: ctx.error };
  if (percent !== null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) return { error: 'Informe um percentual entre 0 e 100.' };

  const { data, error } = await createAdminClient()
    .from('band_members')
    .update({ profit_share: percent })
    .eq('band_id', ctx.bandId)
    .eq('user_id', userId)
    .eq('role', 'owner')
    .select('user_id');
  if (error || !data?.length) return { error: 'Não foi possível salvar o percentual.' };

  revalidatePath('/profile');
  revalidatePath('/relatorio');
  return { success: true };
}

/** Owner removes someone from the band (their account is untouched; the band data stays). */
export async function removeMember(userId: string) {
  const ctx = await requireOwner();
  if (!ctx.ok) return { error: ctx.error };
  if (userId === ctx.userId) return { error: 'Use "Sair da banda" para sair.' };

  const admin = createAdminClient();
  const { data: target } = await admin.from('band_members').select('role').eq('band_id', ctx.bandId).eq('user_id', userId).maybeSingle();
  if (!target) return { error: 'Membro não encontrado.' };
  if (target.role === 'owner') return { error: 'Rebaixe o dono para membro antes de removê-lo.' };

  const { error } = await admin.from('band_members').delete().eq('band_id', ctx.bandId).eq('user_id', userId);
  if (error) return { error: 'Não foi possível remover o membro.' };

  revalidatePath('/profile');
  return { success: true };
}

/** Leave a band. The last owner cannot leave. */
export async function leaveBand(bandId: string) {
  const info = await getUserInfo();
  if (!info.userId) return { error: 'Não autenticado.' };
  const membership = info.memberships.find((m) => m.bandId === bandId);
  if (!membership) return { error: 'Você não faz parte desta banda.' };

  const admin = createAdminClient();
  if (membership.role === 'owner') {
    const { data: owners } = await admin.from('band_members').select('user_id').eq('band_id', bandId).eq('role', 'owner');
    if ((owners ?? []).length <= 1) return { error: 'Você é o único dono. Promova outro dono antes de sair.' };
  }

  const { error } = await admin.from('band_members').delete().eq('band_id', bandId).eq('user_id', info.userId);
  if (error) return { error: 'Não foi possível sair da banda.' };

  (await cookies()).delete(BAND_COOKIE);
  revalidateAll();
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    return { error: 'As senhas não coincidem.' };
  }

  if (password.length < 8) {
    return { error: 'A senha deve ter pelo menos 8 caracteres.' };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
