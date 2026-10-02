'use server';

import { revalidatePath } from 'next/cache';
import { getUserInfo } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/admin';
import { isElevated } from '@/lib/admin-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { UPDATE_KINDS, type UpdateKind } from '@/lib/notification-model';
import { sendPushToAll } from '@/lib/push';
import { addSelfAsMember } from '@/lib/bands';
import { dayKey, toIso } from '@/lib/time';

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
 * leva membros, assinatura, gigs, escala, projetos, músicas e repertórios. Bandas com outro dono
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

/**
 * Libera acesso completo a uma banda sem cobrança — o que o `supabase/scripts/grant-free-access.ts`
 * fazia pela linha de comando (§27). Três decisões que valem estar escritas:
 *
 * - **É por banda, não por conta.** A assinatura mora em `subscriptions.band_id`, e uma pessoa pode
 *   ser dona de várias bandas: liberar "o usuário" não quer dizer nada.
 * - **`price_plan` não se mexe**, fica `standard`. De propósito: acesso de cortesia não pode ocupar
 *   vaga no contador de Fundadores da landing.
 * - **Banda com assinatura no Stripe é recusada.** Mexer no status na mão aqui seria desfeito no
 *   próximo evento do webhook (`syncSubscription`), e nesse meio-tempo o painel mostraria uma
 *   verdade que o Stripe não conhece. Cancelar ali se faz pelo portal do cliente.
 *
 * `days: null` = sem prazo. Com prazo, `paid_until` faz o acesso expirar sozinho (`subscriptionState`).
 */
export async function grantPremium(bandId: string, days: number | null) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };

  const admin = createAdminClient();
  const { data: sub } = await admin.from('subscriptions').select('stripe_subscription_id').eq('band_id', bandId).maybeSingle();
  if (!sub) return { error: 'Essa banda não tem linha de assinatura.' };
  if (sub.stripe_subscription_id) {
    return { error: 'Essa banda tem assinatura no Stripe. Cancele por lá antes — o webhook desfaria a mudança feita aqui.' };
  }

  const paidUntil = days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString();
  const { error } = await admin.from('subscriptions').update({ status: 'active', paid_until: paidUntil }).eq('band_id', bandId);
  if (error) {
    console.error('admin: falha ao liberar acesso da banda', bandId, error.message);
    return { error: 'Não foi possível liberar o acesso.' };
  }

  revalidatePath('/admin/usuarios');
  revalidatePath('/admin');
  return { success: true };
}

/**
 * Tira o acesso de cortesia. Volta pra `trial` em vez de forçar `expired`: assim
 * `subscriptionState()` recalcula o estado verdadeiro a partir de `trial_ends_at` — se o teste já
 * acabou fica expirada de qualquer forma, e se ainda tinha dias a banda não perde o que era dela.
 */
export async function revokePremium(bandId: string) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };

  const admin = createAdminClient();
  const { data: sub } = await admin.from('subscriptions').select('stripe_subscription_id').eq('band_id', bandId).maybeSingle();
  if (!sub) return { error: 'Essa banda não tem linha de assinatura.' };
  if (sub.stripe_subscription_id) {
    return { error: 'Essa banda paga pelo Stripe. Cancele pelo portal do cliente, não por aqui.' };
  }

  const { error } = await admin.from('subscriptions').update({ status: 'trial', paid_until: null }).eq('band_id', bandId);
  if (error) {
    console.error('admin: falha ao revogar acesso da banda', bandId, error.message);
    return { error: 'Não foi possível revogar o acesso.' };
  }

  revalidatePath('/admin/usuarios');
  revalidatePath('/admin');
  return { success: true };
}

/**
 * Lança uma atualização do app (aparece no pop-up de todos e na lista "Atualizações do app" do sino).
 * A data é a que aparece para as pessoas; quem já viu o pop-up é decidido por quando foi lançada.
 */
export async function createAppUpdate(input: { kind: string; title: string; body: string; date: string; notify: boolean }) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };

  const title = input.title.trim();
  const body = input.body.trim();
  if (!UPDATE_KINDS.includes(input.kind as UpdateKind)) return { error: 'Escolha o tipo da atualização.' };
  if (!title || title.length > 120) return { error: 'Informe o título (até 120 caracteres).' };
  if (!body || body.length > 2000) return { error: 'Informe a descrição (até 2000 caracteres).' };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  if (!m) return { error: 'Informe a data.' };

  // Hoje = agora (mantém a ordem entre lançamentos do mesmo dia); outro dia = meio-dia em Brasília.
  const publishedAt = input.date === dayKey() ? new Date().toISOString() : toIso(Number(m[1]), Number(m[2]), Number(m[3]), 12, 0);

  // Sem "enviar agora", o push sai no cron diário das 8h (/api/cron/updates-push). Com ele, já nasce
  // como avisada para o cron não repetir o aviso no dia seguinte.
  const { error } = await createAdminClient()
    .from('app_updates')
    .insert({ kind: input.kind, title, body, published_at: publishedAt, push_sent_at: input.notify ? new Date().toISOString() : null });
  if (error) {
    console.error('admin: falha ao lançar atualização:', error.message);
    return { error: 'Não foi possível lançar a atualização.' };
  }
  revalidatePath('/admin/atualizacoes');

  // Urgente (ex.: um bug grave): avisa agora todos os aparelhos inscritos (abrir o app mostra o pop-up).
  const pushed = input.notify ? await sendPushToAll({ title: 'Novidade no Gigueiros', body: title, url: '/dashboard' }) : 0;
  return { success: true, pushed };
}

export async function deleteAppUpdate(id: string) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };

  const { error } = await createAdminClient().from('app_updates').delete().eq('id', id);
  if (error) {
    console.error('admin: falha ao apagar atualização:', error.message);
    return { error: 'Não foi possível apagar.' };
  }
  revalidatePath('/admin/atualizacoes');
  return { success: true };
}

/**
 * Muda o tipo de uma conta (Banda ↔ Freela). Freela é uma pessoa só: recusado se a conta tem outros
 * membros. Ao virar Freela, o dono ganha a linha própria no elenco (`addSelfAsMember`) e as gigs que
 * ainda não tinham escala passam a ter ele escalado com o cachê da gig (é assim que o Freela vê o que
 * tem a receber). Voltar a Banda não mexe em dados.
 */
export async function setBandKind(bandId: string, kind: 'banda' | 'freela') {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };
  if (kind !== 'banda' && kind !== 'freela') return { error: 'Tipo inválido.' };

  const admin = createAdminClient();
  const { data: members } = await admin.from('band_members').select('user_id, role').eq('band_id', bandId);
  if (!members || members.length === 0) return { error: 'Conta não encontrada.' };
  if (kind === 'freela') {
    if (members.length > 1) return { error: 'Essa conta tem mais de uma pessoa. Freela é uma pessoa só: remova os outros membros antes.' };

    const owner = members.find((m) => m.role === 'owner');
    if (!owner) return { error: 'Essa conta não tem dono.' };
    const selfId = await addSelfAsMember(bandId, owner.user_id as string);
    if (!selfId) return { error: 'Não foi possível criar o músico do dono.' };

    const { data: gigs } = (await admin.from('go_gigs').select('id, gross_value, start_time, go_lineup(id), gig_payments(amount)').eq('band_id', bandId)) as unknown as {
      data: { id: string; gross_value: number; start_time: string; go_lineup: { id: string }[]; gig_payments: { amount: number }[] }[] | null;
    };
    const bare = (gigs ?? []).filter((g) => g.go_lineup.length === 0);
    if (bare.length > 0) {
      // A gig already played whose cachê was fully received (e.g. imported as "recebido") enters as paid; the rest is still to receive.
      const now = Date.now();
      const received = (g: (typeof bare)[number]) => Number(g.gross_value) > 0 && new Date(g.start_time).getTime() < now && g.gig_payments.reduce((sum, p) => sum + Number(p.amount), 0) >= Number(g.gross_value);
      const { error } = await admin.from('go_lineup').insert(bare.map((g) => ({ gig_id: g.id, member_id: selfId, fee_amount: Number(g.gross_value), status: received(g) ? 'pago' : 'pendente' })));
      if (error) return { error: 'Não foi possível escalar o dono nas gigs existentes.' };
    }
  }

  const { error } = await admin.from('bands').update({ kind }).eq('id', bandId);
  if (error) return { error: 'Não foi possível mudar o tipo da conta.' };

  revalidatePath('/admin/usuarios');
  return { success: true };
}

/** Cota mensal de importações por IA de uma conta. Vazio volta ao padrão do app (`IMPORT_QUOTA`). */
export async function setImportQuota(bandId: string, quota: number | null) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return { error: gate.error };
  if (quota !== null && (!Number.isInteger(quota) || quota < 0 || quota > 1000)) return { error: 'Cota inválida (0 a 1000).' };

  const { error } = await createAdminClient().from('subscriptions').update({ import_quota: quota }).eq('band_id', bandId);
  if (error) return { error: 'Não foi possível salvar a cota.' };

  revalidatePath('/admin/usuarios');
  return { success: true };
}
