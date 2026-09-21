import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { subscriptionState, type SubscriptionRow, type SubscriptionState } from '@/lib/subscription';

export const BAND_COOKIE = 'gg_band';

/** Role inside the CURRENT band: owner -> 'admin', member -> 'viewer'. */
export type UserRole = 'admin' | 'viewer';

export type Membership = { bandId: string; name: string; role: 'owner' | 'member' };

export type UserInfo = {
  role: UserRole;
  email: string | undefined;
  /** go_members.id of this person in the current band. */
  memberId: string | null;
  userId: string | null;
  /** The band the user is currently working in (null when they belong to none). */
  bandId: string | null;
  bandName: string | null;
  memberships: Membership[];
  subscription: SubscriptionState | null;
  /** Modules the band's plan includes. */
  modules: { gestao: boolean; repertorio: boolean };
};

const EMPTY: UserInfo = {
  role: 'viewer',
  email: undefined,
  memberId: null,
  userId: null,
  bandId: null,
  bandName: null,
  memberships: [],
  subscription: null,
  modules: { gestao: true, repertorio: true },
};

type MembershipRow = { band_id: string; role: 'owner' | 'member'; bands: { name: string } | { name: string }[] | null };

/**
 * Single unified auth call (memoised per request).
 * A person can belong to several bands; the current one comes from a cookie and is
 * validated against real memberships (falls back to the first band they own).
 */
export const getUserInfo = cache(async (): Promise<UserInfo> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) return EMPTY;

  const userId = claims.sub;
  const email = claims.email as string | undefined;

  const { data: rows } = await supabase
    .from('band_members')
    .select('band_id, role, bands(name)')
    .eq('user_id', userId);

  const memberships: Membership[] = ((rows ?? []) as unknown as MembershipRow[])
    .map((r) => ({
      bandId: r.band_id,
      role: r.role,
      name: (Array.isArray(r.bands) ? r.bands[0]?.name : r.bands?.name) ?? 'Banda',
    }))
    .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner') || a.name.localeCompare(b.name));

  if (memberships.length === 0) return { ...EMPTY, email, userId };

  const wanted = (await cookies()).get(BAND_COOKIE)?.value;
  const current = memberships.find((m) => m.bandId === wanted) ?? memberships[0];

  const memberQuery = email
    ? supabase
        .from('go_members')
        .select('id')
        .eq('band_id', current.bandId)
        .or(`user_id.eq.${userId},email.eq."${email}"`)
        .limit(1)
        .maybeSingle()
    : supabase.from('go_members').select('id').eq('band_id', current.bandId).eq('user_id', userId).limit(1).maybeSingle();

  const [{ data: member }, { data: sub }] = await Promise.all([
    memberQuery as unknown as Promise<{ data: { id: string } | null }>,
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at, paid_until, module_gestao, module_repertorio')
      .eq('band_id', current.bandId)
      .maybeSingle() as unknown as Promise<{ data: (SubscriptionRow & { module_gestao: boolean; module_repertorio: boolean }) | null }>,
  ]);

  return {
    role: current.role === 'owner' ? 'admin' : 'viewer',
    email,
    memberId: member?.id ?? null,
    userId,
    bandId: current.bandId,
    bandName: current.name,
    memberships,
    subscription: subscriptionState(sub),
    modules: { gestao: sub?.module_gestao ?? true, repertorio: sub?.module_repertorio ?? true },
  };
});

export type BandModule = 'gestao' | 'repertorio';

export type BandContext =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; bandId: string; userId: string; role: 'owner' | 'member' }
  | { ok: false; error: string };

/**
 * For server actions that change a band's data: the caller must belong to the current band, the
 * subscription must be usable and (optionally) the plan must include the module. Writes go through
 * the session client, so RLS applies as well.
 */
export async function requireBand(module?: BandModule): Promise<BandContext> {
  const info = await getUserInfo();
  if (!info.userId) return { ok: false, error: 'Não autenticado.' };
  if (!info.bandId) return { ok: false, error: 'Você não faz parte de nenhuma banda.' };
  if (info.subscription?.state === 'expired') {
    return { ok: false, error: 'A assinatura desta banda expirou. Os dados estão preservados; renove para voltar a editar.' };
  }
  if (module && !info.modules[module]) return { ok: false, error: 'Este módulo não está incluído no plano da banda.' };
  return { ok: true, supabase: await createClient(), bandId: info.bandId, userId: info.userId, role: info.role === 'admin' ? 'owner' : 'member' };
}

export type OwnerContext =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; bandId: string; userId: string }
  | { ok: false; error: string };

/** Same as requireBand, but only band owners pass. */
export async function requireOwner(module?: BandModule): Promise<OwnerContext> {
  const ctx = await requireBand(module);
  if (!ctx.ok) return ctx;
  if (ctx.role !== 'owner') return { ok: false, error: 'Sem permissão.' };
  return { ok: true, supabase: ctx.supabase, bandId: ctx.bandId, userId: ctx.userId };
}
