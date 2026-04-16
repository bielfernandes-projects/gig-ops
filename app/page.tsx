import { supabase } from '@/lib/supabase';
import { QuickAddGig } from '@/components/quick-add-gig';
import { GigWithProject, LineupWithMember, GoProject, GoLineup } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth';

export const revalidate = 0;

export default async function Home() {
  const role = await getUserRole();

  const { data: gigsData, error } = await supabase
    .from('go_gigs')
    .select(`
      *,
      go_projects ( name, color_hex )
    `)
    .order('date', { ascending: true }) as { data: GigWithProject[] | null, error: PostgrestError | null };

  const { data: projectsData } = await supabase
    .from('go_projects')
    .select('*')
    .order('name', { ascending: true }) as { data: GoProject[] | null };

  const { data: lineupsData } = await supabase
    .from('go_lineup')
    .select('*') as { data: LineupWithMember[] | null };

  // Calculate generic statistics
  const gigs = gigsData || [];
  const projects = projectsData || [];
  const lineups = lineupsData || [];

  const totalGross = gigs.reduce((acc, gig) => acc + gig.gross_value, 0);
  const totalCost = lineups.reduce((acc, member) => acc + member.fee_amount, 0);
  const netProfit = totalGross - totalCost;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative">
      {/* Top Header / Stats */}
      <header className="mb-10">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-50 mb-6 font-display">
          Agenda Geral
        </h1>
        
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
          <div className="min-w-[140px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Lucro Estimado</span>
            <span className="text-xl md:text-2xl font-black text-emerald-400">R$ {netProfit.toFixed(2)}</span>
          </div>
          <div className="min-w-[140px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Gigs Ativas</span>
            <span className="text-xl md:text-2xl font-black text-zinc-100">{gigs.length}</span>
          </div>
          <div className="min-w-[140px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 snap-start">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Músicos Escalados</span>
            <span className="text-xl md:text-2xl font-black text-zinc-100">{lineups.length}</span>
          </div>
        </div>
      </header>

      {error && (
         <div className="p-4 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
           <h2 className="font-bold mb-2">Erro ao carregar os dados:</h2>
           <pre className="text-xs overflow-auto p-4 bg-black/50 rounded-lg">
             {JSON.stringify(error, null, 2)}
           </pre>
         </div>
      )}

      {/* Main Timeline Content */}
      <main className="flex flex-col gap-4 pb-32">
        {gigs.length === 0 && !error ? (
          <div className="w-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-zinc-400 font-medium tracking-wide">A agenda está vazia.</p>
            {role === 'admin' && <p className="text-zinc-500 text-sm mt-1">Toque no + para agendar a primeira Gig.</p>}
          </div>
        ) : (
          gigs.map((gig) => {
            const lineupData = lineups.filter(l => l.gig_id === gig.id);
            return <GigCard key={gig.id} gig={gig} lineupData={lineupData} />;
          })
        )}
      </main>

      {/* FAB (Floating Action Button) - Only for Admins */}
      {role === 'admin' && <QuickAddGig projects={projects} />}
    </div>
  );
}

function GigCard({ gig, lineupData }: { gig: GigWithProject; lineupData: GoLineup[] }) {
  const lineupFees = lineupData.reduce((acc, curr) => acc + curr.fee_amount, 0);
  const soundCost = gig.bring_sound ? (gig.sound_cost ?? 0) : 0;
  const estimatedProfit = gig.gross_value - lineupFees - soundCost;
  
  const projectColor = gig.go_projects?.color_hex || '#71717a';
  
  const gigDate = new Date(gig.date);
  const day = gigDate.getDate().toString().padStart(2, '0');
  const month = gigDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');

  return (
    <Link 
      href={`/gigs/${gig.id}`}
      className="flex w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer block"
    >
      <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 border-r border-zinc-800 min-w-[72px]">
        <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-1">
          {month}
        </span>
        <span className="text-2xl font-black" style={{ color: projectColor }}>
          {day}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 md:p-5">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: projectColor }} aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: projectColor }}>
                {gig.go_projects?.name || 'Projeto sem nome'}
              </span>
            </div>
            <h2 className="text-base md:text-lg font-bold text-zinc-100 leading-tight">
              {gig.title}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 flex items-center">
              <span className="truncate">{gig.location}</span>
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-zinc-800/60">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Bruto</span>
            <span className="text-sm font-medium text-zinc-400">R$ {gig.gross_value.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Lucro Estimado</span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${
              estimatedProfit >= 0
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}>
              R$ {estimatedProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
