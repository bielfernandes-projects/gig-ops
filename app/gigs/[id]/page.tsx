import { supabase } from '@/lib/supabase';
import { GigWithProject, LineupWithMember, GoMember } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { TogglePaymentButton } from './toggle-payment-button';
import { AddLineupMember } from '@/components/add-lineup-member';
import { getUserRole } from '@/lib/auth';

export const revalidate = 0;

export default async function GigDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const role = await getUserRole();
  
  // Fetch Gig with Project Join
  const { data: gigData, error: gigError } = await supabase
    .from('go_gigs')
    .select(`
      *,
      go_projects ( * )
    `)
    .eq('id', id)
    .single() as { data: GigWithProject | null, error: PostgrestError | null };

  if (gigError || !gigData) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-zinc-100 font-bold mb-4">Gig não encontrado</h2>
        {gigError && (
          <pre className="text-xs text-red-400 bg-red-400/10 p-4 rounded-lg text-left overflow-auto mb-4 border border-red-400/20">
            {JSON.stringify(gigError, null, 2)}
          </pre>
        )}
        <Link href="/" className="text-emerald-500 mt-4 block p-3 bg-zinc-900 rounded-lg">Voltar à Timeline</Link>
      </div>
    );
  }

  // Fetch Lineup with Members Join
  const { data: lineupData } = await supabase
    .from('go_lineup')
    .select(`
      *,
      go_members ( name, instrument )
    `)
    .eq('gig_id', id) as { data: LineupWithMember[] | null, error: PostgrestError | null };

  // Fetch all available members for the form
  const { data: membersData } = await supabase
    .from('go_members')
    .select('*')
    .order('name', { ascending: true }) as { data: GoMember[] | null };

  const lineup = lineupData || [];
  const members = membersData || [];

  const projectColor = gigData.go_projects?.color_hex || '#71717a';

  const gigDate = new Date(gigData.date);
  const dateFormatted = gigDate.toLocaleDateString('pt-BR', { 
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
  });
  const timeFormatted = gigDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', minute: '2-digit' 
  });

  const totalCost = lineup.reduce((acc, curr) => acc + curr.agreed_fee, 0);
  const netProfit = gigData.gross_value - totalCost;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative pb-32">
      {/* Top Header */}
      <header className="mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para Timeline
        </Link>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 inline-flex" style={{ backgroundColor: `${projectColor}15`, padding: '4px 10px', borderRadius: '6px', border: '1px solid #27272a', width: 'fit-content' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: projectColor }} aria-hidden="true" />
            <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: projectColor }}>
              {gigData.go_projects?.name || 'Projeto Desconhecido'}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            {gigData.title}
          </h1>
          
          <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 stroke-[1.5]" />
              <span className="capitalize">{dateFormatted} às {timeFormatted}</span>
            </div>
            <span className="hidden md:block text-zinc-700">•</span>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 stroke-[1.5]" />
              <span className="truncate">{gigData.location}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Financial Summary Card */}
      <section className="mb-10">
        <h2 className="text-sm font-bold tracking-wide text-zinc-300 uppercase mb-4 px-1">Resumo Financeiro</h2>
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Valor Bruto Acordado</span>
            <span className="text-xl md:text-2xl font-bold text-zinc-50">R$ {gigData.gross_value}</span>
          </div>
          
          <div className="hidden md:block w-px h-12 bg-zinc-800" />
          <div className="md:hidden h-px w-full bg-zinc-800/80" />
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Custo Escala Total</span>
            <span className="text-xl md:text-2xl font-bold text-red-400">R$ {totalCost}</span>
          </div>
          
          <div className="hidden md:block w-px h-12 bg-zinc-800" />
          <div className="md:hidden h-px w-full bg-zinc-800/80" />

          <div className="flex flex-col gap-1.5 md:items-end">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500">Lucro Líquido do Projeto</span>
            <span className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tight">R$ {netProfit}</span>
          </div>
        </div>
      </section>

      {/* Lineup Section */}
      <section>
        <div className="flex items-end justify-between mb-4 px-1">
           <h2 className="text-sm font-bold tracking-wide text-zinc-300 uppercase flex items-center gap-2">
            Escala de Músicos
          </h2>
          <span className="text-xs font-bold px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg">
            {lineup.length} Confirmados
          </span>
        </div>
        
        <div className="flex flex-col gap-3">
          {lineup.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
              Nenhuma escala montada para este evento ainda.
            </div>
          )}
          {lineup.map((freela) => {
            return (
              <div 
                key={freela.id} 
                className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:bg-zinc-900 transition-colors"
              >
                <div className="flex flex-col gap-1 h-full justify-center">
                  <span className="font-bold text-zinc-50 text-base">{freela.go_members?.name || 'Músico Desconhecido'}</span>
                  <span className="text-xs font-medium text-zinc-500">{freela.go_members?.instrument || 'Instrumento'}</span>
                </div>
                
                <div className="flex flex-col items-end gap-2 justify-center">
                  <span className="font-semibold text-zinc-300">R$ {freela.agreed_fee}</span>
                  <TogglePaymentButton lineupId={freela.id} currentStatus={freela.is_paid} role={role} />
                </div>
              </div>
            );
          })}
          
          {/* Add Musician Button (Client Component Modal) */}
          {role === 'admin' && <AddLineupMember gigId={id} members={members} />}
        </div>
      </section>
    </div>
  );
}
