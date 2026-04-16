import { supabase } from '@/lib/supabase';
import { GigWithProject, LineupWithMember, GoMember, GoProject } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import { ArrowLeft, Clock, MapPin, Volume2, StickyNote, Calendar } from 'lucide-react';
import Link from 'next/link';
import { AddLineupMember } from '@/components/add-lineup-member';
import { LineupMemberCard } from '@/components/lineup-member-card';
import { EditGigModal } from '@/components/edit-gig-modal';
import { getUserRole } from '@/lib/auth';

export const revalidate = 0;

export default async function GigDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const role = await getUserRole();

  // Fetch Gig with Project Join (no FK hint — avoids schema cache issues)
  const { data: gigData, error: gigError } = await supabase
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

  // Fetch all available members (for lineup + edit-gig form)
  const { data: membersData } = await supabase
    .from('go_members')
    .select('*')
    .order('name', { ascending: true }) as { data: GoMember[] | null };

  // Fetch projects for the edit-gig form
  const { data: projectsData } = await supabase
    .from('go_projects')
    .select('*')
    .order('name', { ascending: true }) as { data: GoProject[] | null };

  // Fetch sound person separately (avoids FK hint / schema cache fragility)
  let soundPerson: { name: string; instrument: string } | null = null;
  if (gigData.sound_person_id) {
    const { data } = await supabase
      .from('go_members')
      .select('name, instrument')
      .eq('id', gigData.sound_person_id)
      .single();
    soundPerson = data;
  }

  const lineup = lineupData || [];
  const members = membersData || [];
  const projects = projectsData || [];

  const projectColor = gigData.go_projects?.color_hex || '#71717a';

  const gigDate = new Date(gigData.start_time);
  const dateFormatted = gigDate.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
  const timeFormatted = gigDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit'
  });

  const lineupCost = lineup.reduce((acc, curr) => acc + curr.fee_amount, 0);
  const soundCost = gigData.bring_sound ? (gigData.sound_cost ?? 0) : 0;
  const totalCost = lineupCost + soundCost;
  const netProfit = gigData.gross_value - totalCost;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative pb-32">
      {/* Top Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar para Timeline
          </Link>

          {/* Edit Gig Button — admin only */}
          {role === 'admin' && (
            <EditGigModal gig={gigData} projects={projects} members={members} />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="flex items-center gap-2 inline-flex"
            style={{ backgroundColor: `${projectColor}15`, padding: '4px 10px', borderRadius: '6px', border: '1px solid #27272a', width: 'fit-content' }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: projectColor }} aria-hidden="true" />
            <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: projectColor }}>
              {gigData.go_projects?.name || 'Projeto Desconhecido'}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            {gigData.title}
          </h1>

          {/* Meta Info List */}
          <div className="flex flex-col gap-3 text-sm text-zinc-400">
            {/* Date */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 stroke-[1.5] text-emerald-500/80" />
              <span className="capitalize font-medium text-zinc-200">
                {dateFormatted}
              </span>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 stroke-[1.5] text-zinc-500" />
              <span className="text-zinc-300">
                {timeFormatted}
                {gigData.end_time && (
                  <>
                    {' '}– {new Date(gigData.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    <span className="ml-2 px-1.5 py-0.5 bg-zinc-800 text-[10px] font-bold text-zinc-400 rounded uppercase tracking-wider">
                      {(() => {
                        const diffMs = new Date(gigData.end_time).getTime() - new Date(gigData.start_time).getTime();
                        if (diffMs <= 0) return '';
                        const totalMins = Math.floor(diffMs / 60000);
                        const h = Math.floor(totalMins / 60);
                        const m = totalMins % 60;
                        if (h > 0 && m > 0) return `${h}h${m}m`;
                        if (h > 0) return `${h}h`;
                        return `${m}m`;
                      })()}
                    </span>
                  </>
                )}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 stroke-[1.5] text-zinc-500" />
              <span className="truncate text-zinc-300">{gigData.location}</span>
            </div>

            {/* Sound equipment info */}
            {gigData.bring_sound && (
              <div className="flex items-center gap-3 text-amber-400/90">
                <Volume2 className="w-5 h-5 stroke-[1.5]" />
                <span className="font-semibold">
                  Levar som
                  {soundPerson && (
                    <span className="text-zinc-500 font-normal ml-2"> · {soundPerson.name}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Financial Summary Card */}
      <section className="mb-10">
        <h2 className="text-sm font-bold tracking-wide text-zinc-300 uppercase mb-4 px-1">Resumo Financeiro</h2>
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Cachê Bruto</span>
              <span className="text-xl md:text-2xl font-bold text-zinc-50">R$ {gigData.gross_value.toFixed(2)}</span>
            </div>

            <div className="hidden md:block w-px h-12 bg-zinc-800" />

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Músicos (Escala)</span>
              <span className="text-xl md:text-2xl font-bold text-red-400">− R$ {lineupCost.toFixed(2)}</span>
            </div>

            {gigData.bring_sound && (
              <>
                <div className="hidden md:block w-px h-12 bg-zinc-800" />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-amber-500/80 font-semibold">Custo do Som</span>
                  <span className="text-xl md:text-2xl font-bold text-amber-400">− R$ {soundCost.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="hidden md:block w-px h-12 bg-zinc-800" />

            <div className="flex flex-col gap-1.5 md:items-end">
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500">Lucro Líquido</span>
              <span className={`text-2xl md:text-3xl font-black tracking-tight ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                R$ {netProfit.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="md:hidden h-px w-full bg-zinc-800/60" />
        </div>
      </section>

      {/* Notes Section */}
      {gigData.notes && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 px-1">
            <StickyNote className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-bold tracking-wide text-zinc-300 uppercase">Observações</h2>
          </div>
          <div className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 md:p-6 shadow-sm">
            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
              {gigData.notes}
            </p>
          </div>
        </section>
      )}

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

          {lineup.map((freela) => (
            <LineupMemberCard
              key={freela.id}
              freela={freela}
              gigId={id}
              role={role}
            />
          ))}

          {/* Add Musician Button — visible to admins only */}
          {role === 'admin' && <AddLineupMember gigId={id} members={members} />}
        </div>
      </section>
    </div>
  );
}
