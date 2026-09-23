import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { subscriptionState, type SubscriptionRow, type SubscriptionState } from '@/lib/subscription';
export { ALL_BANDS } from '@/lib/band-view';

export const BAND_COOKIE = 'gg_band';

/** Role inside a band: owner -> 'admin', member -> 'viewer'. */
export type UserRole = 'admin' | 'viewer';

export type Membership = { bandId: string; name: string; role: 'owner' | 'member' };

export type PricePlan = 'standard' | 'founder' | 'solo';

/** Everything that depends on which band a record belongs to. */
export type BandScope = {
  bandId: string;
  name: string;
  role: UserRole;
  /** go_members.id of this person in that band. */
  memberId: string | null;
  subscription: SubscriptionState;
  modules: { gestao: boolean; repertorio: boolean };
  pricePlan: PricePlan;
};

export type UserInfo = {
  /** In the "all bands" view: 'admin' when the person owns at least one band. Per-record decisions use `bands[bandId].role`. */
  role: UserRole;
  email: string | undefined;
  /** go_members.id in the selected band (null in the "all bands" view — use `bands[bandId].memberId`). */
  memberId: string | null;
  userId: string | null;
  /** The selected band. Null when the person belongs to none OR is in the "all bands" view (see `allBands`). */
  bandId: string | null;
  bandName: string | null;
  memberships: Membership[];
  /** True when the consolidated view is active (only possible with 2+ bands). */
  allBands: boolean;
  /** Bands whose data the current view shows. */
  bandIds: string[];
  /** Details for every band the person belongs to, keyed by band id. */
  bands: Record<string, BandScope>;
  subscription: SubscriptionState | null;
  modules: { gestao: boolean; repertorio: boolean };
  /** True for one of the first 50 bands, locked into the founder price forever. */
  isFounder: boolean;
  pricePlan: PricePlan;
};

const EMPTY: UserInfo = {
  role: 'viewer',
  email: undefined,
  memberId: null,
  userId: null,
  bandId: null,
  bandName: null,
  memberships: [],
  allBands: false,
  bandIds: [],
  bands: {},
  subscription: null,
  modules: { gestao: true, repertorio: true },
  isFounder: false,
  pricePlan: 'standard',
};

type MembershipRow = { band_id: string; role: 'owner' | 'member'; bands: { name: string } | { name: string }[] | null };
type SubRow = SubscriptionRow & { band_id: string; module_gestao: boolean; module_repertorio: boolean; price_plan: PricePlan };

/**
 * Single unified auth call (memoised per request).
 * A person can belong to several bands. The cookie picks one band or the consolidated view
 * ("all", the default with 2+ bands); it is validated against real memberships.
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

  const ids = memberships.map((m) => m.bandId);
  const memberQuery = email
    ? supabase.from('go_members').select('id, band_id').in('band_id', ids).or(`user_id.eq.${userId},email.eq."${email}"`)
    : supabase.from('go_members').select('id, band_id').in('band_id', ids).eq('user_id', userId);

  const [{ data: members }, { data: subs }] = await Promise.all([
    memberQuery as unknown as Promise<{ data: { id: string; band_id: string }[] | null }>,
    supabase
      .from('subscriptions')
      .select('band_id, status, trial_ends_at, paid_until, module_gestao, module_repertorio, price_plan')
      .in('band_id', ids) as unknown as Promise<{ data: SubRow[] | null }>,
  ]);

  const bands: Record<string, BandScope> = {};
  for (const m of memberships) {
    const sub = subs?.find((s) => s.band_id === m.bandId) ?? null;
    bands[m.bandId] = {
      bandId: m.bandId,
      name: m.name,
      role: m.role === 'owner' ? 'admin' : 'viewer',
      memberId: members?.find((r) => r.band_id === m.bandId)?.id ?? null,
      subscription: subscriptionState(sub),
      modules: { gestao: sub?.module_gestao ?? true, repertorio: sub?.module_repertorio ?? true },
      pricePlan: sub?.price_plan ?? 'standard',
    };
  }

  const wanted = (await cookies()).get(BAND_COOKIE)?.value;
  const picked = memberships.find((m) => m.bandId === wanted);
  const base = { email, userId, memberships, bands };

  if (memberships.length > 1 && !picked) {
    const all = Object.values(bands);
    return {
      ...base,
      role: all.some((b) => b.role === 'admin') ? 'admin' : 'viewer',
      memberId: null,
      bandId: null,
      bandName: 'Todas as bandas',
      allBands: true,
      bandIds: ids,
      subscription: null,
      modules: { gestao: all.some((b) => b.modules.gestao), repertorio: all.some((b) => b.modules.repertorio) },
      isFounder: false,
      pricePlan: 'standard',
    };
  }

  const current = bands[(picked ?? memberships[0]).bandId];
  return {
    ...base,
    role: current.role,
    memberId: current.memberId,
    bandId: current.bandId,
    bandName: current.name,
    allBands: false,
    bandIds: [current.bandId],
    subscription: current.subscription,
    modules: current.modules,
    isFounder: current.pricePlan === 'founder',
    pricePlan: current.pricePlan,
  };
});

/** Bands (in the current view) where the person is an owner — the ones they can create records in. */
export function ownedBands(info: UserInfo): { bandId: string; name: string }[] {
  return info.bandIds.filter((id) => info.bands[id]?.role === 'admin').map((id) => ({ bandId: id, name: info.bands[id].name }));
}

export type BandModule = 'gestao' | 'repertorio';

export type BandContext =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; bandId: string; userId: string; role: 'owner' | 'member' }
  | { ok: false; error: string };

/**
 * For server actions that change a band's data: the caller must belong to the band, its
 * subscription must be usable and (optionally) the plan must include the module. Writes go through
 * the session client, so RLS applies as well. `bandId` defaults to the selected band; pass it
 * explicitly for records chosen in the "all bands" view (see `requireBandFor`).
 */
export async function requireBand(module?: BandModule, bandId?: string | null): Promise<BandContext> {
  const info = await getUserInfo();
  if (!info.userId) return { ok: false, error: 'Não autenticado.' };
  const target = bandId || info.bandId;
  if (!target) {
    return { ok: false, error: info.memberships.length ? 'Escolha uma banda no filtro para fazer isso.' : 'Você não faz parte de nenhuma banda.' };
  }
  const band = info.bands[target];
  if (!band) return { ok: false, error: 'Sem permissão.' };
  if (band.subscription.state === 'expired') {
    return { ok: false, error: 'A assinatura desta banda expirou. Os dados estão preservados; renove para voltar a editar.' };
  }
  if (module && !band.modules[module]) return { ok: false, error: 'Este módulo não está incluído no plano da banda.' };
  return { ok: true, supabase: await createClient(), bandId: target, userId: info.userId, role: band.role === 'admin' ? 'owner' : 'member' };
}

export type OwnerContext =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; bandId: string; userId: string }
  | { ok: false; error: string };

/** Same as requireBand, but only band owners pass. */
export async function requireOwner(module?: BandModule, bandId?: string | null): Promise<OwnerContext> {
  const ctx = await requireBand(module, bandId);
  if (!ctx.ok) return ctx;
  if (ctx.role !== 'owner') return { ok: false, error: 'Sem permissão.' };
  return { ok: true, supabase: ctx.supabase, bandId: ctx.bandId, userId: ctx.userId };
}

type BandTable = 'go_gigs' | 'go_members' | 'go_projects' | 'songs' | 'setlists' | 'gig_expenses' | 'gig_payments';

/** Band of an existing record (RLS-limited read), so actions on it work from any view. */
export async function bandOf(table: BandTable, id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select('band_id').eq('id', id).maybeSingle();
  return (data?.band_id as string | undefined) ?? null;
}

/** requireBand scoped to the band an existing record belongs to. */
export async function requireBandFor(table: BandTable, id: string, module?: BandModule): Promise<BandContext> {
  const bandId = await bandOf(table, id);
  if (!bandId) return { ok: false, error: 'Registro não encontrado.' };
  return requireBand(module, bandId);
}

/** Band of a lineup row (go_lineup has no band_id of its own: it hangs off the gig). */
export async function bandOfLineup(lineupId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('go_lineup').select('go_gigs!inner(band_id)').eq('id', lineupId).maybeSingle();
  const gig = data?.go_gigs as { band_id: string } | { band_id: string }[] | undefined;
  return (Array.isArray(gig) ? gig[0]?.band_id : gig?.band_id) ?? null;
}

/** requireOwner scoped to the band an existing record belongs to. */
export async function requireOwnerFor(table: BandTable, id: string, module?: BandModule): Promise<OwnerContext> {
  const bandId = await bandOf(table, id);
  if (!bandId) return { ok: false, error: 'Registro não encontrado.' };
  return requireOwner(module, bandId);
}
