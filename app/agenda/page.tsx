import { createClient } from '@/lib/supabase/server';
import { QuickAddGig } from '@/components/quick-add-gig';
import { FilterTabs } from '@/components/filter-tabs';
import { CopyLogisticsButton } from '@/components/copy-logistics-button';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { GigWithProject, GoProject, GoLineup, GoMember } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { Suspense } from 'react';

export const revalidate = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

const TZ = 'America/Sao_Paulo';

// Y/M/D as seen in Brasília, independent of the server timezone (Vercel runs in UTC).
function brYMD(d: Date): [number, number, number] {
  const [y, m, day] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(d).split('-').map(Number);
  return [y, m, day];
}

// 00:00 of today in Brasília (UTC-3, no DST since 2019).
function startOfTodayBR(): Date {
  const [y, m, d] = brYMD(new Date());
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
}

function filterGigs(gigs: GigWithProject[], tab: string, from?: string, to?: string): GigWithProject[] {
  const now = startOfTodayBR();

  if (tab === '7days') {
    const end = new Date(now.getTime() + 8 * 86400000 - 1);
    return gigs.filter((g) => {
      const d = new Date(g.start_time);
      return d >= now && d <= end;
    });
  }

  if (tab === 'month') {
    const [y, m] = brYMD(new Date());
    return gigs.filter((g) => {
      const [gy, gm] = brYMD(new Date(g.start_time));
      return gy === y && gm === m;
    });
  }

  if (tab === 'custom' && from && to) {
    const start = new Date(`${from.slice(0, 10)}T00:00:00-03:00`);
    const end = new Date(`${to.slice(0, 10)}T23:59:59.999-03:00`);
    return gigs.filter((g) => {
      const d = new Date(g.start_time);
      return d >= start && d <= end;
    });
  }

  // 'all' — all gigs (past + future)
  return gigs;
}

function groupByMonth(gigs: GigWithProject[]): [string, GigWithProject[]][] {
  const map = new Map<string, GigWithProject[]>();
  for (const gig of gigs) {
    const d = new Date(gig.start_time);
    const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
    const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
    if (!map.has(capitalized)) map.set(capitalized, []);
    map.get(capitalized)!.push(gig);
  }
  return Array.from(map.entries());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function formatDuration(startIso: string, endIso: string): string {
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (diffMs <= 0) return '';
  const totalMins = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h${m}m de show`;
  if (h > 0) return `${h}h de show`;
  return `${m}m de show`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; cloneId?: string; project?: string }>;
}) {
  const { tab = '7days', from, to, cloneId, project = 'all' } = await searchParams;

  // Single auth call (replaces getUserRole + getUserEmail + go_members lookup)
  const { role, memberId: userMemberId, bandId } = await getUserInfo();
  if (!bandId) redirect('/onboarding');
  const supabase = await createClient();

  // Multi-tenant isolation: every read is scoped to a single "tenant admin id".
  //   - Admins own themselves (userId).
  //   - Everyone is scoped to the band they are currently working in (bandId).
  //   - Without a tenant id we MUST return nothing (defense in depth).
  //     Using a sentinel UUID that no row can match (Postgres "all-0" UUID)
  //     ensures RLS-equivalent isolation at the application layer even when
  //     the viewer is unlinked.
  const SENTINEL_NO_TENANT = '00000000-0000-0000-0000-000000000000';
  const effectiveTenantId = bandId ?? SENTINEL_NO_TENANT;

  // Build queries with tenant-admin isolation
  let gigsQuery = supabase
    .from('go_gigs')
    .select(`
      id, project_id, title, location, start_time, end_time, gross_value, 
      bring_sound, sound_cost, sound_person_id, notes, is_sound_paid,
      go_projects ( name, color_hex )
    `)
    .eq('band_id', effectiveTenantId)
    .order('start_time', { ascending: true });

  let projectsQuery = supabase
    .from('go_projects')
    .select('*')
    .eq('band_id', effectiveTenantId)
    .order('name', { ascending: true });

  let membersQuery = supabase
    .from('go_members')
    .select('*')
    .eq('band_id', effectiveTenantId)
    .order('name', { ascending: true });

  // Parallel data fetching — all queries run simultaneously
  const [gigsResult, projectsResult, cloneResult, membersResult] = await Promise.all([
    gigsQuery as unknown as Promise<{ data: GigWithProject[] | null, error: PostgrestError | null }>,
    projectsQuery as unknown as Promise<{ data: GoProject[] | null }>,
    cloneId && bandId
      ? supabase
          .from('go_gigs')
          .select('id, project_id, title, location, gross_value, bring_sound, sound_cost, sound_person_id, notes')
          .eq('id', cloneId)
          .eq('band_id', bandId)
          .single() as unknown as Promise<{ data: Partial<GigWithProject> | null }>
      : Promise.resolve({ data: null }),
    membersQuery as unknown as Promise<{ data: GoMember[] | null }>,
  ]);

  const allGigs = gigsResult.data || [];
  const error = gigsResult.error;
  const projects = projectsResult.data || [];
  const cloneData = cloneResult.data ?? null;
  const members = membersResult.data || [];

  // Fetch lineups only for the gigs we already have — this is the multi-tenant seam.
  // Viewers see lineups for gigs they're invited to (still inside their tenant).
  // If there's no tenant (no admin link yet), we read no lineups.
  const gigIdsForLineups = allGigs.map(g => g.id);
  let lineups: GoLineup[] = [];
  if (gigIdsForLineups.length > 0) {
    const { data } = await supabase
      .from('go_lineup')
      .select('*')
      .in('gig_id', gigIdsForLineups);
    lineups = (data as GoLineup[] | null) || [];
  }

  // Admins see every gig in their tenant. Viewers see only gigs where they
  // (their resolved go_members.id) appear in the lineup.
  let visibleGigs = (role === 'admin')
    ? allGigs
    : allGigs.filter(gig => lineups.some(l => l.gig_id === gig.id && l.member_id === userMemberId));

  // Filter by selected project
  if (project !== 'all') {
    visibleGigs = visibleGigs.filter(g => g.project_id === project);
  }

  // Pending gigs: past gigs with unpaid musicians or unpaid sound equipment
  const now2 = new Date();
  const pendingGigs = visibleGigs.filter(gig => {
    const gigDate = new Date(gig.start_time);
    if (gigDate >= now2) return false; // Only past gigs
    
    const gigLineups = lineups.filter(l => l.gig_id === gig.id);
    
    if (role === 'admin') {
      const anyMusicianUnpaid = gigLineups.some(l => l.status !== 'pago');
      const soundUnpaid = gig.bring_sound && (gig.sound_cost ?? 0) > 0 && !gig.is_sound_paid;
      return anyMusicianUnpaid || soundUnpaid;
    } else {
      const myLineup = gigLineups.find(l => l.member_id === userMemberId);
      return myLineup && myLineup.status !== 'pago';
    }
  });

  // Exclude pending gigs from the main timeline to avoid showing them twice
  const pendingGigIds = new Set(pendingGigs.map(g => g.id));
  const filtered = filterGigs(visibleGigs, tab, from, to).filter(g => !pendingGigIds.has(g.id));
  const grouped = groupByMonth(filtered);

  // My cachê on the shows still to come (respects the current filter).
  const upcomingFee = filtered.reduce((acc, gig) => {
    if (new Date(gig.start_time) < now2) return acc;
    const myLineup = lineups.find(l => l.gig_id === gig.id && l.member_id === userMemberId);
    return acc + (myLineup ? myLineup.fee_amount : 0);
  }, 0);

  // My cachê on shows already played that has not been paid to me yet.
  const feeToReceive = pendingGigs.reduce((acc, gig) => {
    const myLineup = lineups.find(l => l.gig_id === gig.id && l.member_id === userMemberId);
    return acc + (myLineup && myLineup.status !== 'pago' ? myLineup.fee_amount : 0);
  }, 0);

  // Owners: what the band still owes its crew (musicians + sound) for shows already played.
  const feeToPay = role === 'admin'
    ? pendingGigs.reduce((acc, gig) => {
        const unpaid = lineups.filter(l => l.gig_id === gig.id && l.status !== 'pago').reduce((s, l) => s + l.fee_amount, 0);
        const sound = gig.bring_sound && !gig.is_sound_paid ? Number(gig.sound_cost ?? 0) : 0;
        return acc + unpaid + sound;
      }, 0)
    : 0;

  // "Shows Total" stat:
  //   - Admin: every gig in their tenant (all statuses, past + future).
  //   - Viewer: only past gigs where they were actually in the lineup
  //     (cancelled gigs that never happened don't count).
  const totalShows = role === 'admin'
    ? allGigs.length
    : allGigs.filter(gig => {
        const gigDate = new Date(gig.start_time);
        if (gigDate >= now2) return false; // only past
        return lineups.some(l => l.gig_id === gig.id && l.member_id === userMemberId);
      }).length;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-50 mb-6">
          Agenda
        </h1>

        {/* Stats strip */}
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x hide-scrollbar mb-6">
          <div className="min-w-[140px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start shrink-0">
            <span className="text-xs font-medium text-zinc-500 block mb-1">Próximos cachês</span>
            <span className="text-xl font-bold text-zinc-100">R$ {upcomingFee.toFixed(2)}</span>
          </div>
          <div className="min-w-[140px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start shrink-0">
            <span className="text-xs font-medium text-zinc-500 block mb-1">A receber</span>
            <span className={`text-xl font-bold ${feeToReceive > 0 ? 'text-amber-300' : 'text-zinc-400'}`}>R$ {feeToReceive.toFixed(2)}</span>
          </div>
          {role === 'admin' && (
            <div className="min-w-[140px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start shrink-0">
              <span className="text-xs font-medium text-zinc-500 block mb-1">A pagar à equipe</span>
              <span className={`text-xl font-bold ${feeToPay > 0 ? 'text-amber-300' : 'text-zinc-400'}`}>R$ {feeToPay.toFixed(2)}</span>
            </div>
          )}
          <div className="min-w-[120px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start shrink-0">
            <span className="text-xs font-medium text-zinc-500 block mb-1">Shows no total</span>
            <span className="text-xl font-bold text-zinc-100">{totalShows}</span>
          </div>
          <div className="min-w-[120px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start shrink-0">
            <span className="text-xs font-medium text-zinc-500 block mb-1">Na seleção</span>
            <span className="text-xl font-bold text-zinc-100">{filtered.length}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <Suspense>
          <FilterTabs projects={projects} />
        </Suspense>
      </header>

      {error && (
        <div className="p-4 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
          <h2 className="font-bold mb-2">Erro ao carregar agenda</h2>
          <p className="text-sm text-red-400/80 mb-3">
            Não foi possível carregar seus shows. Verifique sua conexão e tente novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Timeline */}
      <main className="flex flex-col gap-8 pb-32">
        {filtered.length === 0 && !error ? (
          <div className="w-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-zinc-400 font-medium tracking-wide">Nenhum show neste período.</p>
            {tab !== 'all' && (
              <p className="text-zinc-500 text-sm mt-1">Tente a <span className="text-zinc-400 font-semibold">Agenda Completa</span>.</p>
            )}
            {role === 'admin' && tab === 'all' && (
              <p className="text-zinc-500 text-sm mt-1">Toque no + para agendar o primeiro show.</p>
            )}
          </div>
        ) : (
          grouped.map(([month, monthGigs]) => (
            <section key={month}>
              {/* Month Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold tracking-wide text-zinc-500">
                  {month}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600 font-medium">
                  {monthGigs.length} {monthGigs.length === 1 ? 'show' : 'shows'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {monthGigs.map((gig) => {
                  const lineupData = lineups.filter((l) => l.gig_id === gig.id);
                  const gigDate = new Date(gig.start_time);
                  const isPast = gigDate < now2;
                  
                  let isFullyPaid = false;
                  if (isPast) {
                    if (role === 'admin') {
                      const anyMusicianUnpaid = lineupData.some(l => l.status !== 'pago');
                      const soundUnpaid = gig.bring_sound && (gig.sound_cost ?? 0) > 0 && !gig.is_sound_paid;
                      isFullyPaid = !anyMusicianUnpaid && !soundUnpaid && lineupData.length > 0;
                    } else {
                      const myLineup = lineupData.find(l => l.member_id === userMemberId);
                      isFullyPaid = myLineup ? myLineup.status === 'pago' : false;
                    }
                  }
                  
                  return (
                    <GigCard key={gig.id} gig={gig} lineupData={lineupData} role={role} userMemberId={userMemberId} isPastFullyPaid={isFullyPaid} />
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {role === 'admin' && <QuickAddGig projects={projects} members={members} cloneData={cloneData} adminMemberId={userMemberId} />}

      {/* Pending Gigs Section */}
      {pendingGigs.length > 0 && (
        <section className="mt-8 pb-32">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold tracking-wide text-amber-500">
              Pendentes ({pendingGigs.length})
            </span>
            <div className="flex-1 h-px bg-amber-500/20" />
          </div>
          <div className="flex flex-col gap-3">
            {pendingGigs.map((gig) => {
              const lineupData = lineups.filter((l) => l.gig_id === gig.id);
              return (
                <GigCard key={`pending-${gig.id}`} gig={gig} lineupData={lineupData} role={role} userMemberId={userMemberId} isPastFullyPaid={false} />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── GigCard ────────────────────────────────────────────────────────────────

function GigCard({ gig, lineupData, role, userMemberId, isPastFullyPaid = false }: { gig: GigWithProject; lineupData: GoLineup[], role: string, userMemberId: string | null, isPastFullyPaid?: boolean }) {
  const lineupFees = lineupData.reduce((acc, curr) => acc + curr.fee_amount, 0);
  const soundCost = gig.bring_sound ? (gig.sound_cost ?? 0) : 0;
  
  let estimatedProfit = 0;
  let isNotScheduled = false;

  const myLineup = lineupData.find(l => l.member_id === userMemberId);
  if (myLineup) {
    estimatedProfit = myLineup.fee_amount;
  } else {
    isNotScheduled = true;
  }

  const isGigPronta = (gig.gross_value > 0) && (Math.abs(gig.gross_value - (lineupFees + soundCost)) < 0.01);

  const projectColor = gig.go_projects?.color_hex || '#71717a';

  const gigDate = new Date(gig.start_time);
  const day = gigDate.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: TZ });
  const weekday = gigDate.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '').toUpperCase();

  const startStr = formatTime(gig.start_time);
  const endStr = gig.end_time ? formatTime(gig.end_time) : null;
  const duration = gig.end_time ? formatDuration(gig.start_time, gig.end_time) : null;

  const timeDisplay = endStr
    ? `${startStr} – ${endStr}${duration ? ` (${duration})` : ''}`
    : startStr;

  return (
    <div className={`flex w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm group hover:border-zinc-700 transition-colors ${isPastFullyPaid ? 'opacity-70' : ''}`}>
      {/* Date column */}
      <div
        className="flex flex-col items-center justify-center px-4 py-5 bg-zinc-950 border-r border-zinc-800 min-w-[64px] shrink-0 rounded-l-xl overflow-hidden"
      >
        <span className="text-[11px] font-medium text-zinc-600 tracking-wide mb-0.5">{weekday}</span>
        <span className="text-2xl font-bold leading-none" style={{ color: projectColor }}>{day}</span>
      </div>

      {/* Content */}
      <Link href={`/gigs/${gig.id}`} className="flex flex-col flex-1 p-4 min-w-0 relative">
        {/* Project badge + title */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />
            <span className="text-xs font-semibold truncate" style={{ color: projectColor }}>
              {gig.go_projects?.name || '—'}
            </span>
          </div>
          {isPastFullyPaid && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 shrink-0">
              Pago ✓
            </span>
          )}
        </div>
        <h2 className="text-base font-bold text-zinc-100 leading-snug break-words mb-2 line-clamp-2">
          {gig.title}
        </h2>

        {/* Time & location */}
        <div className="flex flex-col gap-0.5 mb-3">
          <p className="text-xs text-zinc-500 truncate">{timeDisplay}</p>
          {gig.location && gig.location !== 'A definir' && (
            <p className="text-xs text-zinc-600 truncate">{gig.location}</p>
          )}
        </div>

        {/* Financial row */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2.5 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">R$ {gig.gross_value.toFixed(2)}</span>
            {isGigPronta && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                Gig OK
              </span>
            )}
          </div>
          {!isNotScheduled ? (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              estimatedProfit >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
            }`}>
              R$ {estimatedProfit.toFixed(2)}
            </span>
          ) : role === 'admin' ? (
            <span className="text-xs text-zinc-600 font-medium">
              R$ 0,00
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-md text-zinc-500 bg-zinc-800/50">
              Não Escalado
            </span>
          )}
        </div>
      </Link>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-1.5 pt-3 pr-3 shrink-0">
        <AddToCalendarButton
          title={gig.title}
          projectName={gig.go_projects?.name}
          start_time={gig.start_time}
          end_time={gig.end_time}
          location={gig.location}
          compact
        />
        <CopyLogisticsButton gig={gig} />
      </div>
    </div>
  );
}
