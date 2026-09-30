import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { GigWithProject, LineupWithMember, GoMember, GoProject } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import { ArrowLeft, Clock, MapPin, Volume2, StickyNote, Calendar } from 'lucide-react';
import { AddLineupMember } from '@/components/add-lineup-member';
import { LineupMemberCard } from '@/components/lineup-member-card';
import { EditGigModal } from '@/components/edit-gig-modal';
import { ToggleSoundPaymentButton } from './toggle-sound-payment-button';
import { BackButton } from '@/components/back-button';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { requireMembership } from '@/lib/auth';
import { GigFinance, type ExpenseRow, type PaymentRow } from '@/components/gig-finance';
import { brl, gigFinance } from '@/lib/finance';
import { fmtDuration, fmtFullDate, fmtTime } from '@/lib/time';
import { isOnLineup, lineupRowOf } from '@/lib/gig-view';
import { PresenceControl } from '@/components/presence-control';
import { GigSetlistPicker } from '@/components/gig-setlist-picker';
import type { BandSetlistOption } from '@/components/gig-setlist';

export const revalidate = 0;

export default async function GigDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // A detail page follows the Gig's own Banda, whatever the band filter says.
  const { info, allBandIds: myBandIds } = await requireMembership();
  const supabase = await createClient();

  // Fetch Gig with Project Join (must happen first — we need the gig data).
  // Filtering by band_id at the SQL layer means an outsider cannot even discover a Gig by ID.
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
      event_type,
      client_name,
      track_receipts,
      recurrence_group_id,
      setlist_id,
      band_id,
      go_projects ( * )
    `)
    .eq('id', id)
    .in('band_id', myBandIds)
    .single() as { data: (GigWithProject & { band_id?: string }) | null, error: PostgrestError | null };

  if (gigError || !gigData) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-zinc-100 font-bold mb-4">Gig não encontrada</h2>
        {gigError && (
          <pre className="text-xs text-red-400 bg-red-400/10 p-4 rounded-lg text-left overflow-auto mb-4 border border-red-400/20">
            {JSON.stringify(gigError, null, 2)}
          </pre>
        )}
        <BackButton className="text-emerald-500 mt-4 block p-3 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors w-full">
          Voltar à Timeline
        </BackButton>
      </div>
    );
  }

  // Everything else is decided by the Gig's Banda: the person's role and member id there.
  const bandId = gigData.band_id ?? null;
  const band = bandId ? info.bands[bandId] : undefined;
  const role = band?.role ?? 'viewer';
  const userMemberId = band?.memberId ?? null;
  const showBandId = bandId ?? myBandIds[0];

  // Queries scoped to the Gig's Banda
  const membersQuery = supabase
    .from('go_members')
    .select('*')
    .eq('band_id', showBandId)
    .order('name', { ascending: true });

  const projectsQuery = supabase
    .from('go_projects')
    .select('*')
    .eq('band_id', showBandId)
    .order('name', { ascending: true });

  // Parallel data fetching — lineup, members, projects, and sound person all at once
  const [lineupResult, membersResult, projectsResult, soundPersonResult, expensesResult, paymentsResult, bandSetlistsResult] = await Promise.all([
    supabase
      .from('go_lineup')
      .select(`*, go_members ( name, instrument )`)
      .eq('gig_id', id) as unknown as Promise<{ data: LineupWithMember[] | null }>,
    membersQuery as unknown as Promise<{ data: GoMember[] | null }>,
    projectsQuery as unknown as Promise<{ data: GoProject[] | null }>,
    gigData.sound_person_id
      ? supabase
          .from('go_members')
          .select('name, instrument')
          .eq('id', gigData.sound_person_id)
          .single() as unknown as Promise<{ data: { name: string; instrument: string } | null }>
      : Promise.resolve({ data: null }),
    role === 'admin'
      ? supabase.from('gig_expenses').select('id, category, description, amount').eq('gig_id', id).order('created_at') as unknown as Promise<{ data: ExpenseRow[] | null }>
      : Promise.resolve({ data: null as ExpenseRow[] | null }),
    role === 'admin'
      ? supabase.from('gig_payments').select('id, amount, paid_at, note').eq('gig_id', id).order('paid_at') as unknown as Promise<{ data: PaymentRow[] | null }>
      : Promise.resolve({ data: null as PaymentRow[] | null }),
    supabase.from('setlists').select('id, name, is_default').eq('band_id', showBandId).eq('scope', 'band').order('name') as unknown as Promise<{ data: BandSetlistOption[] | null }>,
  ]);

  const bandSetlists = (bandSetlistsResult.data ?? []) as BandSetlistOption[];

  const lineup = lineupResult.data || [];
  const expenses = (expensesResult.data || []).map((e) => ({ ...e, amount: Number(e.amount) }));
  const payments = (paymentsResult.data || []).map((p) => ({ ...p, amount: Number(p.amount) }));
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const members = membersResult.data || [];
  const projects = projectsResult.data || [];
  const soundPerson = soundPersonResult.data;

  const projectColor = gigData.go_projects?.color_hex || '#71717a';

  if (role !== 'admin') {
    // A Membro reaches a Gig's detail page only by being on its Escala. (That the Gig belongs to
    // one of their Bandas is already settled by the `.in('band_id', myBandIds)` filter above.)
    const isInLineup = isOnLineup(lineup, userMemberId);
    if (!isInLineup) {
      return (
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 md:p-12 shadow-xl">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Acesso Negado</h2>
            <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto">
              Você não está escalado para esta gig e não tem permissão para visualizar estes detalhes.
            </p>
          <BackButton
              className="inline-flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-6 py-3 rounded-xl text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Timeline
          </BackButton>
          </div>
        </div>
      );
    }
  }

  const dateFormatted = fmtFullDate(gigData.start_time);
  const timeFormatted = fmtTime(gigData.start_time);

  // Money math comes from lib/finance, so the `track_receipts` rule applies here exactly as it does
  // on the Relatório — this page used to inline its own sums and silently skip it.
  const lineupCost = lineup.reduce((acc, curr) => acc + Number(curr.fee_amount), 0);
  const soundCost = gigData.bring_sound ? Number(gigData.sound_cost ?? 0) : 0;
  const receivedTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const fin = gigFinance({
    gross: Number(gigData.gross_value),
    lineupCost,
    soundCost,
    expenses: expensesTotal,
    trackReceipts: !!gigData.track_receipts,
    received: receivedTotal,
  });
  const netProfit = fin.profit;

  const myLineup = lineupRowOf(lineup, userMemberId);
  const viewerFee = role === 'viewer' ? Number(myLineup?.fee_amount ?? 0) : 0;
  const viewerNotScheduled = role === 'viewer' && !myLineup;
  const adminMyLineup: LineupWithMember | undefined = role === 'admin' ? myLineup : undefined;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative pb-32">
      {/* Top Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <BackButton
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar para Timeline
          </BackButton>

          <div className="flex items-center gap-2">
            {/* Edit Gig Button — admin only */}
            {role === 'admin' && (
              <Link href={`/gigs/${id}/recibo`} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800">
                Recibo
              </Link>
            )}
            {role === 'admin' && (
              <EditGigModal gig={gigData} projects={projects} members={members} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="flex items-center gap-2 inline-flex"
            style={{ backgroundColor: `${projectColor}15`, padding: '4px 10px', borderRadius: '6px', border: '1px solid #27272a', width: 'fit-content' }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: projectColor }} aria-hidden="true" />
            <span className="text-xs font-semibold" style={{ color: projectColor }}>
              {gigData.go_projects?.name || 'Projeto Desconhecido'}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
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
                    {' '}– {fmtTime(gigData.end_time)}
                    <span className="ml-2 px-1.5 py-0.5 bg-zinc-800 text-xs font-medium text-zinc-400 rounded">
                      {fmtDuration(gigData.start_time, gigData.end_time, '')}
                    </span>
                  </>
                )}
              </span>
            </div>

            {gigData.event_type && (
              <div className="flex items-center gap-3">
                <StickyNote className="w-5 h-5 stroke-[1.5] text-zinc-500" />
                <span className="text-zinc-300">{gigData.event_type}</span>
              </div>
            )}

            {role === 'admin' && gigData.client_name && (
              <div className="flex items-center gap-3">
                <StickyNote className="w-5 h-5 stroke-[1.5] text-zinc-500" />
                <span className="text-zinc-300">Contratante: {gigData.client_name}</span>
              </div>
            )}

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

        {/* Full-width Add to Calendar button */}
        <div className="mt-6">
          <AddToCalendarButton
            title={gigData.title}
            projectName={gigData.go_projects?.name}
            start_time={gigData.start_time}
            end_time={gigData.end_time}
            location={gigData.location}
            fullWidth
          />
        </div>
      </header>

      {/* Financial Summary Card */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4 px-1">Resumo Financeiro</h2>
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-500">Cachê Bruto</span>
              <span className="text-xl md:text-2xl font-bold text-zinc-50">{brl(Number(gigData.gross_value))}</span>
            </div>

            {role === 'admin' && (
              <>
                <div className="hidden md:block w-px h-12 bg-zinc-800" />
                <div className="flex flex-col gap-1.5">
                   <span className="text-xs font-medium text-zinc-500">Músicos (Escala)</span>
                  <span className="text-xl md:text-2xl font-bold text-red-400">− {brl(lineupCost)}</span>
                </div>
              </>
            )}

            {gigData.bring_sound && (
              <>
                <div className="hidden md:block w-px h-12 bg-zinc-800" />
                <div className="flex flex-col gap-1.5">
                   <span className="text-xs font-medium text-amber-500/80">Custo do Som</span>
                  <span className="text-xl md:text-2xl font-bold text-amber-400">− {brl(soundCost)}</span>
                </div>
              </>
            )}

            {role === 'admin' && expensesTotal > 0 && (
              <>
                <div className="hidden md:block w-px h-12 bg-zinc-800" />
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">Despesas</span>
                  <span className="text-xl md:text-2xl font-bold text-red-400">− {brl(expensesTotal)}</span>
                </div>
              </>
            )}

            <div className="hidden md:block w-px h-12 bg-zinc-800" />

            {role === 'admin' ? (
              adminMyLineup ? (
                <div className="flex flex-col gap-1.5 md:items-end">
                   <span className="text-xs font-semibold text-emerald-500">Seu Cachê</span>
                   <span className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-400">
                    {brl(Number(adminMyLineup.fee_amount))}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 md:items-end">
                   <span className="text-xs font-semibold text-emerald-500">Lucro Líquido</span>
                   <span className={`text-2xl md:text-3xl font-bold tracking-tight ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {brl(netProfit)}
                  </span>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-1.5 md:items-end">
                 <span className="text-xs font-semibold text-emerald-500">Meu Cachê</span>
                {!viewerNotScheduled ? (
                   <span className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-400">
                     {brl(viewerFee)}
                   </span>
                 ) : (
                   <span className="text-lg md:text-xl font-medium tracking-tight text-zinc-500 mt-1 md:mt-2">
                    Não Escalado
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="md:hidden h-px w-full bg-zinc-800/60" />
        </div>
      </section>

      {myLineup && (
        <PresenceControl lineupId={myLineup.id} status={(myLineup.confirmation ?? 'pending') as 'pending' | 'confirmed' | 'declined'} />
      )}

      {role === 'admin' && (
        <GigFinance
          gigId={id}
          gross={gigData.gross_value}
          trackReceipts={!!gigData.track_receipts}
          expenses={expenses}
          payments={payments}
          fin={fin}
        />
      )}

      {info.modules.repertorio && (
        <GigSetlistPicker gigId={id} currentId={gigData.setlist_id ?? null} options={bandSetlists} isOwner={role === 'admin'} />
      )}

      {/* Notes Section */}
      {gigData.notes && role === 'admin' && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 px-1">
            <StickyNote className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-200">Observações</h2>
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
        {role === 'admin' && (
          <div className="flex items-end justify-between mb-4 px-1">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              Escala de Músicos
            </h2>
            <span className="text-xs font-bold px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg">
              {lineup.length} Confirmados
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {lineup.length === 0 && role === 'admin' && (
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

      {/* Equipment/Sound Section */}
      {gigData.bring_sound && gigData.sound_cost > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between mb-4 px-1">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              Equipamento / Som
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:bg-zinc-900 transition-colors group">
              {/* Left: Name & Role */}
              <div className="flex flex-col gap-1 h-full justify-center min-w-0 flex-1 mr-3">
                <span className="font-bold text-zinc-50 text-base truncate">
                  {soundPerson?.name || 'Equipamento de Som'}
                </span>
                <span className="text-xs font-medium text-amber-500/70">
                  Fornecedor de Som
                </span>
              </div>

              {/* Right: Cost + Toggle */}
              {role === 'admin' && (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-semibold text-amber-400 tabular-nums">
                      {brl(Number(gigData.sound_cost))}
                    </span>
                    <ToggleSoundPaymentButton
                      gigId={id}
                      currentStatus={gigData.is_sound_paid}
                      role={role}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
