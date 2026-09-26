'use server';

import { revalidatePath } from 'next/cache';
import { getUserInfo } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/admin';
import { isElevated } from '@/lib/admin-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Gestão de contas pelo painel de produto.
 *
 * Toda action aqui refaz a checagem, e exige as DUAS camadas: estar na lista de admins e ter
 * confirmado a senha (elevação válida). O gate do layout e o do middleware servem pra esconder a
 * tela; uma server action é um endpoint público, e quem souber o nome dela pode chamá-la direto —
 * então a autorização real mora aqui, uma vez por função. Sem exigir elevação aqui, a senha de
 * entrada seria decoração: bastaria chamar a action depois de ela expirar.
 */
async function requireSuperAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const info = await getUserInfo();
  if (!info.userId || !isSuperAdmin(info.email)) return { ok: false, error: 'Sem permissão.' };
  if (!(await isElevated(info.userId))) return { ok: false, error: 'Sessão do painel expirou. Confirme a senha de novo.' };
  return { ok: true, userId: info.userId };
}

/** Manda o e-mail de redefinição (não devolve link: um link na tela vaza no histórico e em print). */
export async function sendPasswordReset(email: string) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset-password` });
  if (error) {
    console.error('admin: falha ao enviar redefinição de senha:', error.message);
    return { error: 'Não foi possível enviar o e-mail de redefinição.' };
  }
  return { success: true };
}

export type DeletionImpact = {
  email: string;
  /** Bandas que morrem com a conta: as que só essa pessoa tem como dona. */
  bandsDestroyed: { id: string; name: string; gigs: number; members: number; songs: number }[];
  /** Bandas que sobrevivem (têm outro dono): a pessoa só sai delas. */
  bandsKept: string[];
};

/** O que exatamente será destruído. A confirmação na tela mostra isso — nada é apagado às cegas. */
export async function previewUserDeletion(userId: string): Promise<DeletionImpact | { error: string }> {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (!authUser?.user) return { error: 'Conta não encontrada.' };

  const { data: memberships } = await admin.from('band_members').select('band_id, role, bands(name)').eq('user_id', userId);
  const rows = (memberships ?? []) as { band_id: string; role: 'owner' | 'member'; bands: { name: string } | { name: string }[] | null }[];
  const nameOfBand = (r: (typeof rows)[number]) => (Array.isArray(r.bands) ? r.bands[0]?.name : r.bands?.name) ?? 'Banda';

  const ownedIds = rows.filter((r) => r.role === 'owner').map((r) => r.band_id);

  // Uma banda só morre se esta pessoa for a ÚNICA dona.
  const { data: allOwners } = ownedIds.length
    ? await admin.from('band_members').select('band_id, user_id').in('band_id', ownedIds).eq('role', 'owner')
    : { data: [] as { band_id: string; user_id: string }[] };
  const ownerCount = new Map<string, number>();
  for (const o of allOwners ?? []) ownerCount.set(o.band_id, (ownerCount.get(o.band_id) ?? 0) + 1);

  const soleOwned = ownedIds.filter((id) => (ownerCount.get(id) ?? 0) <= 1);

  const bandsDestroyed = await Promise.all(
    soleOwned.map(async (id) => {
      const [gigs, members, songs] = await Promise.all([
        admin.from('go_gigs').select('id', { count: 'exact', head: true }).eq('band_id', id) as unknown as Promise<{ count: number | null }>,
        admin.from('go_members').select('id', { count: 'exact', head: true }).eq('band_id', id) as unknown as Promise<{ count: number | null }>,
        admin.from('songs').select('id', { count: 'exact', head: true }).eq('band_id', id) as unknown as Promise<{ count: number | null }>,
      ]);
      const row = rows.find((r) => r.band_id === id)!;
      return { id, name: nameOfBand(row), gigs: gigs.count ?? 0, members: members.count ?? 0, songs: songs.count ?? 0 };
    })
  );

  return {
    email: authUser.user.email ?? 'sem e-mail',
    bandsDestroyed,
    bandsKept: rows.filter((r) => !soleOwned.includes(r.band_id)).map(nameOfBand),
  };
}

/**
 * Apaga a conta e, com ela, as bandas das quais era a única dona — o `on delete cascade` de `bands`
 * leva membros, assinatura, shows, escala, projetos, músicas e repertórios. Bandas com outro dono
 * ficam de pé: a pessoa só deixa de ser membro (cascade de `band_members.user_id`).
 * Irreversível: a tela chama `previewUserDeletion` antes e mostra exatamente isso.
 */
export async function deleteUser(userId: string) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };
  if (userId === gate.userId) return { error: 'Você não pode apagar a sua própria conta por aqui.' };

  const impact = await previewUserDeletion(userId);
  if ('error' in impact) return { error: impact.error };

  const admin = createAdminClient();
  for (const band of impact.bandsDestroyed) {
    const { error } = await admin.from('bands').delete().eq('id', band.id);
    if (error) {
      console.error('admin: falha ao apagar banda', band.id, error.message);
      return { error: `Não foi possível apagar a banda "${band.name}". A conta não foi apagada.` };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('admin: falha ao apagar conta', userId, error.message);
    return { error: 'As bandas foram apagadas, mas a conta de autenticação não. Tente de novo.' };
  }

  revalidatePath('/admin/usuarios');
  revalidatePath('/admin');
  return { success: true };
}
