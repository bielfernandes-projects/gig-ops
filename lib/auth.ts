import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { subscriptionState, type SubscriptionRow, type SubscriptionState } from '@/lib/subscription';
import { memberRowsFilter } from '@/lib/identity';
import { FREELA_NO_TEAM, IMPORT_QUOTA, type BandKind } from '@/lib/plans';
export { ALL_BANDS } from '@/lib/band-view';

export const BAND_COOKIE = 'gg_band';

/**
 * Stand-in band id for a person who belongs to no Banda. Passing it to `.in('band_id', …)` matches
 * nothing, which is what we want: the query returns empty instead of being built without a filter.
 */
export const NO_BAND = '00000000-0000-0000-0000-000000000000';

/**
 * The app's single vocabulary for a role inside a Banda. The database says 'owner' / 'member'; the
 * mapping to these two words happens exactly once, where the membership row is read, so no reader
 * of an action has to hold both spellings in their head.
 */
export type UserRole = 'admin' | 'viewer';

/** A row of `band_members`, in the database's own spelling. */
export type Membership = { bandId: string; name: string; role: 'owner' | 'member'; kind: BandKind };

export type PricePlan = 'standard' | 'founder' | 'solo';

/** Everything that depends on which band a record belongs to. */
export type BandScope = {
  bandId: string;
  name: string;
  role: UserRole;
  /** 'banda' (equipe, escala, despesas) or 'freela' (uma pessoa, sem equipe). See lib/plans. */
  kind: BandKind;
  /** Importações por IA permitidas por mês nesta conta. */
  importQuota: number;
  /** go_members.id of this person in that band (the first, when there is more than one). */
  memberId: string | null;
  /**
   * Every go_members.id that is this person in that band. Normally one, but a Banda can end up with
   * two rows for the same human — one added by e-mail, one linked to their account — and summing
   * their Cachês must not miss either. See lib/identity.
   */
  memberIds: string[];
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
  /** Tipo da banda selecionada ('banda' na visão "todas"). */
  kind: BandKind;
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
  kind: 'banda',
};

type BandRef = { name: string; kind: BandKind };
type MembershipRow = { band_id: string; role: 'owner' | 'member'; bands: BandRef | BandRef[] | null };
type SubRow = SubscriptionRow & { band_id: string; module_gestao: boolean; module_repertorio: boolean; price_plan: PricePlan; import_quota: number | null };

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
    .select('band_id, role, bands(name, kind)')
    .eq('user_id', userId);

  const memberships: Membership[] = ((rows ?? []) as unknown as MembershipRow[])
    .map((r) => {
      const band = Array.isArray(r.bands) ? r.bands[0] : r.bands;
      return { bandId: r.band_id, role: r.role, name: band?.name ?? 'Banda', kind: band?.kind ?? 'banda' };
    })
    .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner') || a.name.localeCompare(b.name));

  if (memberships.length === 0) return { ...EMPTY, email, userId };

  const ids = memberships.map((m) => m.bandId);
  const memberQuery = email
    ? supabase.from('go_members').select('id, band_id').in('band_id', ids).or(memberRowsFilter({ userId, email }))
    : supabase.from('go_members').select('id, band_id').in('band_id', ids).eq('user_id', userId);

  const [{ data: members }, { data: subs }] = await Promise.all([
    memberQuery as unknown as Promise<{ data: { id: string; band_id: string }[] | null }>,
    supabase
      .from('subscriptions')
      .select('band_id, status, trial_ends_at, paid_until, module_gestao, module_repertorio, price_plan, import_quota')
      .in('band_id', ids) as unknown as Promise<{ data: SubRow[] | null }>,
  ]);

  const bands: Record<string, BandScope> = {};
  for (const m of memberships) {
    const sub = subs?.find((s) => s.band_id === m.bandId) ?? null;
    const myRows = (members ?? []).filter((r) => r.band_id === m.bandId).map((r) => r.id);
    bands[m.bandId] = {
      bandId: m.bandId,
      name: m.name,
      role: m.role === 'owner' ? 'admin' : 'viewer',
      kind: m.kind,
      importQuota: sub?.import_quota ?? IMPORT_QUOTA,
      memberId: myRows[0] ?? null,
      memberIds: myRows,
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
      kind: 'banda',
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
    kind: current.kind,
  };
});

/**
 * The precondition every signed-in page shares: there must be a session, and the person must belong
 * to at least one Banda. Pages used to spell this out three incompatible ways — some redirected
 * without checking the session, some checked both, some checked neither and leaned on `NO_BAND`.
 *
 * `bandIds` is the current view's scope (one Banda, or all of them) and `allBandIds` every Banda the
 * person belongs to, whatever the filter says — what a detail page needs, since it follows the
 * record's own Banda. Both are safe to hand straight to `.in('band_id', …)`.
 */
export async function requireMembership(): Promise<{ info: UserInfo; bandIds: string[]; allBandIds: string[] }> {
  const info = await getUserInfo();
  if (!info.userId) redirect('/login');
  if (info.memberships.length === 0) redirect('/onboarding');
  const all = info.memberships.map((m) => m.bandId);
  return {
    info,
    bandIds: info.bandIds.length > 0 ? info.bandIds : [NO_BAND],
    allBandIds: all.length > 0 ? all : [NO_BAND],
  };
}

/** Bands (in the current view) where the person is an owner — the ones they can create records in. */
export function ownedBands(info: UserInfo): { bandId: string; name: string; kind: BandKind }[] {
  return info.bandIds.filter((id) => info.bands[id]?.role === 'admin').map((id) => ({ bandId: id, name: info.bands[id].name, kind: info.bands[id].kind }));
}

export type BandModule = 'gestao' | 'repertorio';

export type BandContext =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; bandId: string; userId: string; role: UserRole }
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
  return { ok: true, supabase: await createClient(), bandId: target, userId: info.userId, role: band.role };
}

export type OwnerContext =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; bandId: string; userId: string }
  | { ok: false; error: string };

/** Same as requireBand, but only band owners pass. */
export async function requireOwner(module?: BandModule, bandId?: string | null): Promise<OwnerContext> {
  const ctx = await requireBand(module, bandId);
  if (!ctx.ok) return ctx;
  if (ctx.role !== 'admin') return { ok: false, error: 'Sem permissão.' };
  return { ok: true, supabase: ctx.supabase, bandId: ctx.bandId, userId: ctx.userId };
}

/** Same as requireOwner, but only for features a one-person Freela account does not have (team, lineup, expenses). */
export async function requireTeam(module?: BandModule, bandId?: string | null): Promise<OwnerContext> {
  const ctx = await requireOwner(module, bandId);
  if (!ctx.ok) return ctx;
  const info = await getUserInfo();
  if (info.bands[ctx.bandId]?.kind === 'freela') return { ok: false, error: FREELA_NO_TEAM };
  return ctx;
}

/** requireTeam scoped to the band an existing record belongs to. */
export async function requireTeamFor(table: BandTable, id: string, module?: BandModule): Promise<OwnerContext> {
  const bandId = await bandOf(table, id);
  if (!bandId) return { ok: false, error: 'Registro não encontrado.' };
  return requireTeam(module, bandId);
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
