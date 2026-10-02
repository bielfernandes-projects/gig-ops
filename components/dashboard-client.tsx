'use client';

import { PageHeader } from '@/components/page-header';
import { NotificationBell } from '@/components/notification-bell';
import { CalendarDays, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GigWithProject, GoLineup } from '@/lib/types';
import { type BandRoles } from '@/lib/band-view';
import { brl } from '@/lib/finance';
import { subscriptionNotice, type Tone } from '@/lib/subscription';

const NOTICE_TONE: Record<Tone, string> = {
  neutral: 'border-zinc-700 bg-zinc-800/50 text-zinc-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  danger: 'border-red-500/30 bg-red-500/10 text-red-300',
};
import {
  byStartTime,
  gigsVisibleTo,
  isUpcoming,
  myFee,
  myUnpaidFee,
  owedByBand,
  ownsGig,
  unsettledGigs,
} from '@/lib/gig-view';
import { fmtShortDateTime } from '@/lib/time';
import { BandTag } from '@/components/band-tag';

const AppTour = dynamic(() => import('@/components/app-tour'), { ssr: false });

type Props = {
  role: string | null;
  /** Whose "already seen the tour" flag to look at — it is stored per account. */
  userId: string;
  /** `go_profiles.tour_seen_at` is set: the tour is done for this account, on any device. */
  tourSeen: boolean;
  bandRoles: BandRoles;
  allBands: boolean;
  gigs: GigWithProject[];
  lineups: GoLineup[];
  subscription: { state: 'trial' | 'active' | 'expired'; daysLeft: number | null } | null;
};

export default function DashboardClient({ role, userId, tourSeen, bandRoles, allBands, gigs, lineups, subscription }: Props) {
  const notice = subscriptionNotice(subscription);

  // 1. Visible Gigs — same rule as the Agenda, from the same module.
  const visibleGigs = gigsVisibleTo(bandRoles, gigs, lineups);

  // 2. Next Gig
  const nextGig = visibleGigs.filter((g) => isUpcoming(g)).sort(byStartTime)[0];

  // 4. Money: my cachê on gigs still to come, what I have yet to receive, and (owners) what the band owes the crew.
  const upcomingFee = visibleGigs.filter((g) => isUpcoming(g)).reduce((acc, g) => acc + myFee(bandRoles, g, lineups), 0);
  // Gigs already played whose money is not settled yet.
  const pendingGigs = unsettledGigs(bandRoles, visibleGigs, lineups);
  const pendingGigsCount = pendingGigs.length;
  const feeToReceive = pendingGigs.reduce((acc, g) => acc + myUnpaidFee(bandRoles, g, lineups), 0);
  const isOwner = Object.values(bandRoles).some((b) => b.role === 'admin');
  const feeToPay = pendingGigs.reduce((acc, g) => acc + (ownsGig(bandRoles, g) ? owedByBand(g, lineups) : 0), 0);

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:p-10 pb-32 flex flex-col gap-8">
      <AppTour role={role === 'admin' ? 'admin' : 'viewer'} userId={userId} tourSeen={tourSeen} />
      <div className="relative">
        <PageHeader title="Dashboard" description="Visão geral da agenda e das finanças." className="mb-0" />
        {/* Desktop only: on phones the bell lives in the top bar. The theme toggle is in the sidebar's "more" button */}
        <div className="absolute right-0 top-0 hidden items-center gap-2 md:flex"><NotificationBell /></div>
      </div>

      {role === 'admin' && notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${NOTICE_TONE[notice.tone]}`}>{notice.text}</div>
      )}

      {/* Grid Layout para Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
          {/* Card Próxima Gig */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CalendarDays className="w-24 h-24 text-zinc-100" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Próxima Gig</h3>
              {nextGig ? (
                <>
                   {allBands && <BandTag name={nextGig.band_id ? bandRoles[nextGig.band_id]?.name : null} className="mb-2" />}
                   <h4 className="text-xl font-bold text-zinc-100 leading-tight mb-2 line-clamp-2">{nextGig.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nextGig.go_projects?.color_hex || '#71717a' }} />
                    <span className="text-sm font-bold text-zinc-400" style={{ color: nextGig.go_projects?.color_hex || '#71717a' }}>{nextGig.go_projects?.name || 'Sem Projeto'}</span>
                  </div>
                  <p className="text-sm text-zinc-300 mt-3 font-medium">
                    {fmtShortDateTime(nextGig.start_time)}
                  </p>
                </>
              ) : (
                <p className="text-zinc-500 text-sm font-medium">Nenhuma gig agendada.</p>
              )}
            </div>
            {nextGig && (
               <Link href={`/gigs/${nextGig.id}`} className="mt-6 flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Ver Detalhes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Card Gigs Pendentes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertTriangle className="w-24 h-24 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Gigs Pendentes</h3>
              <div className="flex items-end gap-3">
                <span className={`text-5xl font-bold leading-none ${pendingGigsCount > 0 ? 'text-amber-500' : 'text-zinc-600'}`}>
                  {pendingGigsCount}
                </span>
                <span className="text-sm text-zinc-400 font-medium mb-1">
                  {pendingGigsCount === 1 ? 'gig pendente' : 'gigs pendentes'}
                </span>
              </div>
            </div>
            {pendingGigsCount > 0 && (
               <Link href="/agenda" className="mt-6 flex items-center gap-2 text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors">
                Resolver Agora <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

        {/* Cachês: os mesmos números da Agenda */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Próximos Cachês</h3>
          <span className="text-3xl font-bold text-zinc-100">{brl(upcomingFee)}</span>
          <p className="mt-1 text-xs text-zinc-500">Nas gigs que ainda vão acontecer.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">A Receber</h3>
          <span className={`text-3xl font-bold ${feeToReceive > 0 ? 'text-amber-300' : 'text-zinc-400'}`}>{brl(feeToReceive)}</span>
          <p className="mt-1 text-xs text-zinc-500">De gigs já realizadas.</p>
        </div>

        {isOwner && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">A Pagar à Equipe</h3>
            <span className={`text-3xl font-bold ${feeToPay > 0 ? 'text-amber-300' : 'text-zinc-400'}`}>{brl(feeToPay)}</span>
            <p className="mt-1 text-xs text-zinc-500">Músicos e som de gigs já realizadas.</p>
          </div>
        )}

      </div>
    </div>
  );
}