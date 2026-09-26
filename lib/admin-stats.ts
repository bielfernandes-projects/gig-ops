import { createAdminClient } from '@/lib/supabase/admin';
import { subscriptionState } from '@/lib/subscription';
import { PRICES, FOUNDER_LIMIT } from '@/lib/pricing';

/**
 * Números do painel de produto (/admin). Tudo com o service role: são dados de todas as bandas, que
 * nenhum cliente de sessão pode ver. As agregações pesadas ficam em funções SQL
 * (`admin_event_counts`, `admin_signups_by_day`, `admin_user_totals`) porque o cliente JS não faz
 * GROUP BY — ver `supabase/migrations/20260927000000_telemetry.sql`.
 */

export type EventCount = { name: string; total: number; users: number };

export type ProductOverview = {
  users: { total: number; active30d: number };
  bands: number;
  owners: number;
  members: number;
  subs: { trial: number; payingCard: number; freeManual: number; expired: number };
  /** Receita recorrente mensal estimada, em BRL. Só quem paga de verdade entra. */
  mrr: number;
  founders: { used: number; limit: number };
  signups: { day: string; total: number }[];
  screens: EventCount[];
  actions: EventCount[];
};

type SubRow = {
  status: 'trial' | 'active' | 'expired';
  trial_ends_at: string;
  paid_until: string | null;
  price_plan: 'standard' | 'founder' | 'solo';
  billing_period: 'monthly' | 'annual' | null;
  stripe_subscription_id: string | null;
};

/** Quanto uma assinatura ativa vale por mês. Anual entra rateado, senão o MRR pula de degrau. */
function monthlyValue(sub: SubRow): number {
  if (sub.billing_period === 'annual') return PRICES.annual / 12;
  return sub.price_plan === 'founder' ? PRICES.founder : PRICES.standard;
}

export async function productOverview(): Promise<ProductOverview> {
  const admin = createAdminClient();

  const [userTotals, bandCount, ownerCount, memberCount, subsResult, founderCount, signupRows, eventRows] = await Promise.all([
    admin.rpc('admin_user_totals') as unknown as Promise<{ data: { total: number; active_30d: number }[] | null }>,
    admin.from('bands').select('id', { count: 'exact', head: true }) as unknown as Promise<{ count: number | null }>,
    admin.from('band_members').select('user_id', { count: 'exact', head: true }).eq('role', 'owner') as unknown as Promise<{ count: number | null }>,
    admin.from('band_members').select('user_id', { count: 'exact', head: true }).eq('role', 'member') as unknown as Promise<{ count: number | null }>,
    admin
      .from('subscriptions')
      .select('status, trial_ends_at, paid_until, price_plan, billing_period, stripe_subscription_id') as unknown as Promise<{ data: SubRow[] | null }>,
    admin.from('subscriptions').select('band_id', { count: 'exact', head: true }).eq('price_plan', 'founder') as unknown as Promise<{ count: number | null }>,
    admin.rpc('admin_signups_by_day', { p_days: 30 }) as unknown as Promise<{ data: { day: string; total: number }[] | null }>,
    admin.rpc('admin_event_counts', { p_days: 30 }) as unknown as Promise<{
      data: { event_kind: string; event_name: string; total: number; distinct_users: number }[] | null;
    }>,
  ]);

  const subs = subsResult.data ?? [];
  const counts = { trial: 0, payingCard: 0, freeManual: 0, expired: 0 };
  let mrr = 0;

  for (const sub of subs) {
    const { state } = subscriptionState(sub);
    if (state === 'trial') counts.trial++;
    else if (state === 'expired') counts.expired++;
    else if (sub.stripe_subscription_id) {
      // Assinatura de cartão: é o que efetivamente entra por mês.
      counts.payingCard++;
      mrr += monthlyValue(sub);
    } else {
      // Ativa sem assinatura no Stripe = liberada na mão (amigos/testers, ou pago via Pix). Conta
      // como ativa, mas fica fora do MRR — somar aqui faria o faturamento mentir pra cima.
      counts.freeManual++;
    }
  }

  const events = eventRows.data ?? [];
  const pick = (kind: string): EventCount[] =>
    events
      .filter((e) => e.event_kind === kind)
      .map((e) => ({ name: e.event_name, total: Number(e.total), users: Number(e.distinct_users) }));

  const totals = userTotals.data?.[0];

  return {
    users: { total: Number(totals?.total ?? 0), active30d: Number(totals?.active_30d ?? 0) },
    bands: bandCount.count ?? 0,
    owners: ownerCount.count ?? 0,
    members: memberCount.count ?? 0,
    subs: counts,
    mrr,
    founders: { used: founderCount.count ?? 0, limit: FOUNDER_LIMIT },
    signups: (signupRows.data ?? []).map((r) => ({ day: r.day, total: Number(r.total) })),
    screens: pick('screen'),
    actions: pick('action'),
  };
}

export type AdminUserBand = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  state: 'trial' | 'active' | 'expired';
  /** Assinatura de cartão no Stripe: acesso não se mexe na mão aqui (o webhook sobrescreveria). */
  hasStripe: boolean;
  /** null com `state` ativo = liberada na mão, sem prazo. */
  paidUntil: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  bands: AdminUserBand[];
};

/**
 * Todas as contas, com as bandas de cada uma. `listUsers` não filtra nem ordena no servidor, então
 * pagina de 200 em 200 — mesmo laço de `supabase/scripts/grant-free-access.ts`.
 */
export async function listUsers(): Promise<AdminUser[]> {
  const admin = createAdminClient();

  const authUsers: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    authUsers.push(...data.users);
    if (data.users.length < 200) break;
  }

  const [profilesResult, membershipResult, subsResult] = await Promise.all([
    admin.from('go_profiles').select('id, display_name') as unknown as Promise<{ data: { id: string; display_name: string | null }[] | null }>,
    admin.from('band_members').select('user_id, band_id, role, bands(name)') as unknown as Promise<{
      data: { user_id: string; band_id: string; role: 'owner' | 'member'; bands: { name: string } | { name: string }[] | null }[] | null;
    }>,
    admin.from('subscriptions').select('band_id, status, trial_ends_at, paid_until, stripe_subscription_id') as unknown as Promise<{
      data: { band_id: string; status: 'trial' | 'active' | 'expired'; trial_ends_at: string; paid_until: string | null; stripe_subscription_id: string | null }[] | null;
    }>,
  ]);

  const nameById = new Map((profilesResult.data ?? []).map((p) => [p.id, p.display_name]));
  const subByBand = new Map(
    (subsResult.data ?? []).map((s) => [s.band_id, { state: subscriptionState(s).state, hasStripe: Boolean(s.stripe_subscription_id), paidUntil: s.paid_until }])
  );

  const bandsByUser = new Map<string, AdminUser['bands']>();
  for (const row of membershipResult.data ?? []) {
    const name = (Array.isArray(row.bands) ? row.bands[0]?.name : row.bands?.name) ?? 'Banda';
    const list = bandsByUser.get(row.user_id) ?? [];
    const sub = subByBand.get(row.band_id);
    list.push({
      id: row.band_id,
      name,
      role: row.role,
      state: sub?.state ?? 'trial',
      hasStripe: sub?.hasStripe ?? false,
      paidUntil: sub?.paidUntil ?? null,
    });
    bandsByUser.set(row.user_id, list);
  }

  return authUsers
    .map((u) => ({
      id: u.id,
      email: u.email ?? 'sem e-mail',
      displayName: nameById.get(u.id) ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      bands: (bandsByUser.get(u.id) ?? []).sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner')),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
