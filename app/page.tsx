import { supabase } from '@/lib/supabase';
import { QuickAddGig } from '@/components/quick-add-gig';
import { FilterTabs } from '@/components/filter-tabs';
import { CopyLogisticsButton } from '@/components/copy-logistics-button';
import { GigWithProject, GoProject, GoLineup } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import Link from 'next/link';
import { StickyNote, AlertTriangle } from 'lucide-react';
import { getUserRole, getUserEmail } from '@/lib/auth';
import { Suspense } from 'react';

export const revalidate = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

function filterGigs(gigs: GigWithProject[], tab: string): GigWithProject[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (tab === '7days') {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return gigs.filter((g) => {
      const d = new Date(g.start_time);
      return d >= now && d <= end;
    });
  }

  if (tab === 'month') {
    const y = now.getFullYear();
    const m = now.getMonth();
    return gigs.filter((g) => {
      const d = new Date(g.start_time);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }

  // 'all' — all gigs (past + future)
  return gigs;
}

function groupByMonth(gigs: GigWithProject[]): [string, GigWithProject[]][] {
  const map = new Map<string, GigWithProject[]>();
  for (const gig of gigs) {
    const d = new Date(gig.start_time);
    const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
    if (!map.has(capitalized)) map.set(capitalized, []);
    map.get(capitalized)!.push(gig);
  }
  return Array.from(map.entries());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = '7days' } = await searchParams;
  const role = await getUserRole();
  const email = await getUserEmail();

  let userMemberId: string | null = null;
  if (email && role !== 'admin') {
    const { data: memberData } = await supabase
      .from('go_members')
      .select('id')
      .eq('email', email)
      .single();
    userMemberId = memberData?.id || null;
  }

  const { data: gigsData, error } = await supabase
    .from('go_gigs')
    .select(`
      id, 
      project_id, 
      title, 
      location, 
      start_time, 
      end_time, 
      gross_value, 
      bring_sound, 
      sound_cost, 
      sound_person_id,
      notes,
      go_projects ( name, color_hex )
    `)
    .order('start_time', { ascending: true }) as { data: GigWithProject[] | null, error: PostgrestError | null };

  const { data: projectsData } = await supabase
    .from('go_projects')
    .select('*')
    .order('name', { ascending: true }) as { data: GoProject[] | null };

  const { data: lineupsData } = await supabase
    .from('go_lineup')
    .select('*') as { data: GoLineup[] | null };

  const allGigs = gigsData || [];
  const projects = projectsData || [];
  const lineups = lineupsData || [];

  const filtered = filterGigs(allGigs, tab);
  const grouped = groupByMonth(filtered);

  // Dynamic profit calculation based on filtered selection: strictly upcoming gigs only
  const now2 = new Date();
  const netProfit = filtered.reduce((acc, gig) => {
    if (new Date(gig.start_time) < now2) return acc;
    
    const gigLineups = lineups.filter(l => l.gig_id === gig.id);
    if (role === 'admin') {
      const lineupFees = gigLineups.reduce((sum, l) => sum + l.fee_amount, 0);
      const soundCost = gig.bring_sound ? (gig.sound_cost ?? 0) : 0;
      return acc + (gig.gross_value - lineupFees - soundCost);
    } else {
      const myLineup = gigLineups.find(l => l.member_id === userMemberId);
      return acc + (myLineup ? myLineup.fee_amount : 0);
    }
  }, 0);

  // Pending gigs: past gigs with at least one unpaid lineup member (admin only)
  const pendingGigs = role === 'admin' ? allGigs.filter(gig => {
    const gigDate = new Date(gig.start_time);
    if (gigDate >= now2) return false; // Only past gigs
    const gigLineups = lineups.filter(l => l.gig_id === gig.id);
    if (gigLineups.length === 0) return false; // No lineup, no pending
    return gigLineups.some(l => l.status !== 'pago');
  }) : [];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-50 mb-6 font-display">
          Agenda
        </h1>

        {/* Stats strip */}
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x hide-scrollbar mb-6">
          <div className="min-w-[140px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">
              {role === 'admin' ? 'Lucro Estimado' : 'Meu Cachê'}
            </span>
            <span className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
              R$ {netProfit.toFixed(2)}
            </span>
          </div>
          <div className="min-w-[120px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Shows Total</span>
            <span className="text-xl font-black text-zinc-100">{allGigs.length}</span>
          </div>
          <div className="min-w-[120px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Nesta Seleção</span>
            <span className="text-xl font-black text-zinc-100">{filtered.length}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <Suspense>
          <FilterTabs />
        </Suspense>
      </header>

      {error && (
        <div className="p-4 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
          <h2 className="font-bold mb-2">Erro ao carregar dados:</h2>
          <pre className="text-xs overflow-auto p-4 bg-black/50 rounded-lg">
            {JSON.stringify(error, null, 2)}
          </pre>
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
                <span className="text-[11px] font-black tracking-[0.2em] uppercase text-zinc-500">
                  {month}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 font-semibold">
                  {monthGigs.length} {monthGigs.length === 1 ? 'show' : 'shows'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {monthGigs.map((gig) => {
                  const lineupData = lineups.filter((l) => l.gig_id === gig.id);
                  const gigDate = new Date(gig.start_time);
                  const isPast = gigDate < now2;
                  const isFullyPaid = isPast && lineupData.length > 0 && lineupData.every(l => l.status === 'pago');
                  return (
                    <GigCard key={gig.id} gig={gig} lineupData={lineupData} role={role} userMemberId={userMemberId} isPastFullyPaid={tab === 'all' && isFullyPaid} />
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {role === 'admin' && <QuickAddGig projects={projects} />}

      {/* Pending Gigs Section */}
      {pendingGigs.length > 0 && (
        <section className="mt-8 pb-32">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-black tracking-[0.2em] uppercase text-amber-500">
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

  if (role === 'admin') {
    estimatedProfit = gig.gross_value - lineupFees - soundCost;
  } else {
    const myLineup = lineupData.find(l => l.member_id === userMemberId);
    if (myLineup) {
      estimatedProfit = myLineup.fee_amount;
    } else {
      isNotScheduled = true;
    }
  }

  const projectColor = gig.go_projects?.color_hex || '#71717a';

  const gigDate = new Date(gig.start_time);
  const day = gigDate.getDate().toString().padStart(2, '0');
  const weekday = gigDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();

  const startStr = formatTime(gig.start_time);
  const endStr = gig.end_time ? formatTime(gig.end_time) : null;
  const duration = gig.end_time ? formatDuration(gig.start_time, gig.end_time) : null;

  const timeDisplay = endStr
    ? `${startStr} – ${endStr}${duration ? ` (${duration})` : ''}`
    : startStr;

  return (
    <div className={`flex w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm group hover:border-zinc-700 transition-colors ${isPastFullyPaid ? 'opacity-40 grayscale' : ''}`}>
      {/* Date column */}
      <div
        className="flex flex-col items-center justify-center px-4 py-5 bg-zinc-950 border-r border-zinc-800 min-w-[64px] shrink-0"
        style={{ borderLeftColor: projectColor, borderLeftWidth: 3 }}
      >
        <span className="text-[9px] font-bold text-zinc-600 tracking-wider uppercase mb-0.5">{weekday}</span>
        <span className="text-2xl font-black leading-none" style={{ color: projectColor }}>{day}</span>
      </div>

      {/* Content */}
      <Link href={`/gigs/${gig.id}`} className="flex flex-col flex-1 p-4 min-w-0 relative">
        {/* Project badge + title */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />
            <span className="text-[10px] font-bold tracking-widest uppercase truncate" style={{ color: projectColor }}>
              {gig.go_projects?.name || '—'}
            </span>
          </div>
          {gig.notes && (
            <StickyNote className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          )}
        </div>
        <h2 className={`text-base font-bold text-zinc-100 leading-snug break-words mb-2 line-clamp-2 ${isPastFullyPaid ? 'line-through' : ''}`}>
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
        <div className="mt-auto flex items-center justify-between pt-2.5 border-t border-zinc-800/60">
          <span className="text-xs text-zinc-500 font-medium">R$ {gig.gross_value.toFixed(2)}</span>
          {!isNotScheduled ? (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              estimatedProfit >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
            }`}>
              ~ R$ {estimatedProfit.toFixed(2)}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-zinc-500 bg-zinc-800/50 uppercase tracking-widest">
              Não Escalado
            </span>
          )}
        </div>
      </Link>

      {/* Copy logistics button */}
      <div className="flex items-start pt-3 pr-3 shrink-0">
        <CopyLogisticsButton gig={gig} />
      </div>
    </div>
  );
}
