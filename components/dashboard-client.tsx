'use client';

import { PageHeader } from '@/components/page-header';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notification-bell';
import { useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CalendarDays, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GigWithProject, GoLineup } from '@/lib/types';
import { type BandRoles } from '@/lib/band-view';
import { brl, brlRound } from '@/lib/finance';
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
  myLineup,
  unsettledGigs,
  PAID,
} from '@/lib/gig-view';
import { endOfDayKey, fmtShortDateTime, monthKey, startOfDayKey, ymd } from '@/lib/time';
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
  const [pieFilter, setPieFilter] = useState<'month' | 'all' | 'custom'>('all'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());

  const notice = subscriptionNotice(subscription);

  // 1. Visible Gigs — same rule as the Agenda, from the same module.
  const visibleGigs = gigsVisibleTo(bandRoles, gigs, lineups);

  // 2. Next Gig
  const nextGig = visibleGigs.filter((g) => isUpcoming(g)).sort(byStartTime)[0];

  // 3. Gigs already played whose money is not settled yet.
  const pendingGigsCount = unsettledGigs(bandRoles, visibleGigs, lineups).length;

  // 4. Pie Chart Data (Lucro por Projeto - Apenas Pagos)
  const thisMonth = monthKey();
  const filteredGigsForPie = visibleGigs.filter(g => {
    if (pieFilter === 'all') return true;
    if (pieFilter === 'month') return monthKey(g.start_time) === thisMonth;
    if (pieFilter === 'custom' && startDate && endDate) {
      const d = new Date(g.start_time);
      return d >= startOfDayKey(startDate) && d <= endOfDayKey(endDate);
    }
    return false;
  });

  const projectProfits: Record<string, { value: number; color: string }> = {};

  filteredGigsForPie.forEach(gig => {
    const mine = myLineup(bandRoles, gig, lineups);

    if (mine && mine.status === PAID) {
      const profit = Number(mine.fee_amount) || 0;
      if (profit > 0) {
        const projName = gig.go_projects?.name || 'Sem Projeto';
        const projColor = gig.go_projects?.color_hex || '#71717a';

        if (!projectProfits[projName]) {
          projectProfits[projName] = { value: 0, color: projColor };
        }
        projectProfits[projName].value += profit;
      }
    }
  });

  const pieChartData = Object.entries(projectProfits).map(([name, data]) => ({
    name,
    value: data.value,
    color: data.color
  }));
  const totalPieProfit = pieChartData.reduce((acc, curr) => acc + curr.value, 0);

  // 5. Line Chart Data (Quantidade de Gigs - Todos os status/períodos)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  // One row per month: the label/timestamp plus a gig count per project name (Recharts needs the
  // project keys flat on the row, since each <Line> reads one dataKey).
  type MonthRow = { label: string; timestamp: number; [project: string]: string | number };
  const monthlyDataMap: Record<string, MonthRow> = {};
  const projectsSet = new Map<string, string>(); // Guarda o nome e a cor de cada projeto

  // Identifica todos os projetos com gigs visíveis
  visibleGigs.forEach((gig) => {
    const projName = gig.go_projects?.name || 'Sem Projeto';
    const projColor = gig.go_projects?.color_hex || '#71717a';
    if (!projectsSet.has(projName)) {
      projectsSet.set(projName, projColor);
    }
  });

  const sortedGigs = [...visibleGigs].sort(byStartTime);

  sortedGigs.forEach(gig => {
    // Group by the month the Gig falls in *in Brazil*, not in the viewer's timezone.
    const [year, month] = ymd(gig.start_time);
    const key = monthKey(gig.start_time);
    const label = `${monthNames[month - 1]} ${year}`;

    const projName = gig.go_projects?.name || 'Sem Projeto';

    if (!monthlyDataMap[key]) {
      monthlyDataMap[key] = { label, timestamp: startOfDayKey(`${key}-01`).getTime() };
      Array.from(projectsSet.keys()).forEach(proj => {
        monthlyDataMap[key][proj] = 0;
      });
    }

    monthlyDataMap[key][projName] = Number(monthlyDataMap[key][projName] ?? 0) + 1;
  });

  const lineChartData = Object.values(monthlyDataMap).sort((a, b) => a.timestamp - b.timestamp);

  const toggleProject = (projName: string) => {
    setHiddenProjects(prev => {
      const next = new Set(prev);
      if (next.has(projName)) next.delete(projName);
      else next.add(projName);
      return next;
    });
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:p-10 pb-32 flex flex-col gap-8">
      <AppTour role={role === 'admin' ? 'admin' : 'viewer'} userId={userId} tourSeen={tourSeen} />
      <div className="relative">
        <PageHeader title="Dashboard" description="Visão geral da agenda e das finanças." className="mb-0" />
        {/* Desktop only: on phones the theme toggle lives in the menu and the bell in the top bar */}
        <div className="absolute right-0 top-0 hidden items-center gap-2 md:flex"><NotificationBell /><ThemeToggle /></div>
      </div>

      {role === 'admin' && notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${NOTICE_TONE[notice.tone]}`}>{notice.text}</div>
      )}

      {/* Grid Layout para Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Cards (Insights) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
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
        </div>

        {/* Coluna Direita: Gráficos */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          
          {/* ─── GRÁFICO 1: MEU CACHÊ POR PROJETO (PIZZA) ─── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col">
            <h3 className="text-zinc-100 font-bold mb-6 flex items-center justify-between">
              <span>Meu Cachê por Projeto (Pagos)</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex w-full sm:w-auto bg-zinc-950 rounded-xl p-1 border border-zinc-800">
                <button onClick={() => setPieFilter('month')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${pieFilter === 'month' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}>Mês</button>
                <button onClick={() => setPieFilter('all')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${pieFilter === 'all' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}>Total</button>
                <button onClick={() => setPieFilter('custom')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${pieFilter === 'custom' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}>Personalizado</button>
              </div>

              {pieFilter === 'custom' && (
                <div className="flex gap-2 flex-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 min-h-[300px] flex items-center justify-center relative" role="img" aria-label={`Gráfico de pizza: Meu cachê por projeto. Total recebido: ${brl(totalPieProfit)}`}>
              {pieChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: unknown) => brl(typeof value === 'number' ? value : 0)}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                    <span className="text-zinc-500 text-xs font-medium">Total Recebido</span>
                    <span className="text-zinc-100 font-bold text-2xl leading-none mt-1">{brlRound(totalPieProfit)}</span>
                  </div>
                </>
              ) : (
                <div className="w-full py-16 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
                  <p className="text-zinc-500 text-sm font-medium">Nenhum cachê pago neste período.</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── GRÁFICO 2: QUANTIDADE DE SHOWS (LINHA) ─── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col">
            <h3 className="text-zinc-100 font-bold mb-4 flex items-center justify-between">
              <span>Quantidade de Gigs por Projeto</span>
            </h3>

            {/* Filtro Dinâmico de Projetos (Botões toggle) */}
            {projectsSet.size > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {Array.from(projectsSet.entries()).map(([name, color]) => {
                  const isActive = !hiddenProjects.has(name);
                  return (
                    <button 
                      key={name} 
                      onClick={() => toggleProject(name)} 
                       className={`px-3 py-1.5 flex items-center gap-2 text-xs font-semibold rounded-lg border transition-all ${isActive ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-zinc-950 text-zinc-500 border-zinc-800 opacity-50 hover:opacity-80'}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 min-h-[300px] flex items-center justify-center relative" role="img" aria-label="Gráfico de linha: Quantidade de gigs por projeto ao longo do tempo">
            {lineChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', fontSize: '0.875rem' }} itemStyle={{ fontWeight: 'bold' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {Array.from(projectsSet.entries()).map(([name, color]) => !hiddenProjects.has(name) && (
                      <Line 
                        key={name} 
                        type="monotone" 
                        dataKey={name} 
                        name={name} 
                        stroke={color} 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: '#09090b', strokeWidth: 2 }} 
                        activeDot={{ r: 6 }} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="w-full py-16 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
                <p className="text-zinc-500 text-sm font-medium">Nenhuma gig neste período.</p>
              </div>
            )}
          </div>
          </div>

        </div>

      </div>
    </div>
  );
}