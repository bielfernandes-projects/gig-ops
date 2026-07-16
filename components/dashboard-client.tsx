'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CalendarDays, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { GigWithProject, GoLineup } from '@/lib/types';

type Props = {
  role: string | null;
  userMemberId: string | null;
  gigs: GigWithProject[];
  lineups: GoLineup[];
};

export default function DashboardClient({ role, userMemberId, gigs, lineups }: Props) {
  const [pieFilter, setPieFilter] = useState<'month' | 'all' | 'custom'>('all'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Visible Gigs
  const visibleGigs = (role === 'admin') 
    ? gigs 
    : gigs.filter(gig => lineups.some(l => l.gig_id === gig.id && l.member_id === userMemberId));

  // 2. Next Gig
  const futureGigs = visibleGigs.filter(g => new Date(g.start_time) >= now);
  futureGigs.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const nextGig = futureGigs[0];

  // 3. Pending Gigs (Shows que ainda têm pagamentos pendentes)
  // For Admin: Past gigs where ANY musician is unpaid OR sound is unpaid
  // For Member: Past gigs where the member is unpaid
  const pendingGigsCount = visibleGigs.filter(gig => {
    const gigDate = new Date(gig.start_time);
    if (gigDate >= now) return false; // Only past gigs
    
    const gigLineups = lineups.filter(l => l.gig_id === gig.id);
    
    if (role === 'admin') {
      const anyMusicianUnpaid = gigLineups.some(l => l.status !== 'pago');
      const soundUnpaid = gig.bring_sound && (gig.sound_cost ?? 0) > 0 && !gig.is_sound_paid;
      return anyMusicianUnpaid || soundUnpaid;
    } else {
      const myLineup = gigLineups.find(l => l.member_id === userMemberId);
      return myLineup && myLineup.status !== 'pago';
    }
  }).length;

  // 4. Pie Chart Data (Lucro por Projeto - Apenas Pagos)
  const filteredGigsForPie = visibleGigs.filter(g => {
    const d = new Date(g.start_time);
    if (pieFilter === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (pieFilter === 'all') return true;
    if (pieFilter === 'custom' && startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      return d >= s && d <= e;
    }
    return false;
  });

  const projectProfits: Record<string, { value: number; color: string }> = {};

  filteredGigsForPie.forEach(gig => {
    const gigLineups = lineups.filter(l => l.gig_id === gig.id);
    const myLineup = gigLineups.find(l => l.member_id === userMemberId);

    if (myLineup && myLineup.status === 'pago') {
      const profit = Number(myLineup.fee_amount) || 0;
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

  // 5. Line Chart Data (Quantidade de Shows - Todos os status/períodos)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyDataMap: Record<string, any> = {};
  const projectsSet = new Map<string, string>(); // Guarda o nome e a cor de cada projeto

  // Identifica todos os projetos com shows visíveis
  visibleGigs.forEach((gig) => {
    const projName = gig.go_projects?.name || 'Sem Projeto';
    const projColor = gig.go_projects?.color_hex || '#71717a';
    if (!projectsSet.has(projName)) {
      projectsSet.set(projName, projColor);
    }
  });

  const sortedGigs = [...visibleGigs].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  sortedGigs.forEach(gig => {
    const d = new Date(gig.start_time);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`; 
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    const projName = gig.go_projects?.name || 'Sem Projeto';

    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = { label, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
      Array.from(projectsSet.keys()).forEach(proj => {
        monthlyDataMap[monthKey][proj] = 0;
      });
    }

    monthlyDataMap[monthKey][projName] += 1;
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
      <header>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-50 mb-2">Dashboard</h1>
        <p className="text-zinc-400 text-sm md:text-base">Visão geral da sua agenda e finanças.</p>
      </header>

      {/* Grid Layout para Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Cards (Insights) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Card Próximo Show */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CalendarDays className="w-24 h-24 text-zinc-100" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Próximo Show</h3>
              {nextGig ? (
                <>
                   <h4 className="text-xl font-bold text-zinc-100 leading-tight mb-2 line-clamp-2">{nextGig.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nextGig.go_projects?.color_hex || '#71717a' }} />
                    <span className="text-sm font-bold text-zinc-400" style={{ color: nextGig.go_projects?.color_hex || '#71717a' }}>{nextGig.go_projects?.name || 'Sem Projeto'}</span>
                  </div>
                  <p className="text-sm text-zinc-300 mt-3 font-medium">
                    {new Date(nextGig.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                  </p>
                </>
              ) : (
                <p className="text-zinc-500 text-sm font-medium">Nenhum show agendado.</p>
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
                  {pendingGigsCount === 1 ? 'show pendente' : 'shows pendentes'}
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

            <div className="flex-1 min-h-[300px] flex items-center justify-center relative" role="img" aria-label={`Gráfico de pizza: Meu cachê por projeto. Total recebido: R$ ${totalPieProfit.toFixed(2)}`}>
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
                        formatter={(value: any) => typeof value === 'number' ? `R$ ${value.toFixed(2)}` : `R$ 0.00`} 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                    <span className="text-zinc-500 text-xs font-medium">Total Recebido</span>
                    <span className="text-zinc-100 font-bold text-2xl leading-none mt-1">R$ {totalPieProfit.toFixed(0)}</span>
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
              <span>Quantidade de Shows por Projeto</span>
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

            <div className="flex-1 min-h-[300px] flex items-center justify-center relative" role="img" aria-label="Gráfico de linha: Quantidade de shows por projeto ao longo do tempo">
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
                <p className="text-zinc-500 text-sm font-medium">Nenhum show neste período.</p>
              </div>
            )}
          </div>
          </div>

        </div>

      </div>
    </div>
  );
}