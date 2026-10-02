'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth';
import { logAction } from '@/lib/telemetry';
import { endInstant, gigInstant } from '@/lib/gig-import-model';
import { dayKey, startOfToday } from '@/lib/time';

export type GigImportPayload = {
  bandId: string;
  /** Used by rows that name no project. */
  defaultProjectId: string | null;
  gigs: { title: string; date: string; time: string; endTime: string | null; fee: number | null; project: string | null; location: string | null; notes: string | null }[];
};

const MAX_GIGS = 300;

/**
 * A gig older than this on the day of the import is history being filled in, not an agenda being planned: its money is
 * assumed already received, so it does not land in the band's "a receber" the moment the list is imported. Shows of the
 * last week stay pending on purpose — that money may still be on its way.
 */
const SETTLED_AFTER_DAYS = 7;
const cut = (v: string | null | undefined, n: number) => (v ?? '').trim().slice(0, n) || null;

// Badge colors for projects created by the import (editable later in Projetos).
const PROJECT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

/**
 * Saves what the person reviewed on the gig-import screen: one gig per row, with no crew (the owner schedules
 * musicians later). Each row goes to the band project it names (created when the band has none by that name),
 * or to the default project. A gig that already exists in the band with the same title
 * and start time is skipped, so importing the same list twice does not duplicate the agenda.
 */
export async function saveImportedGigs(payload: GigImportPayload) {
  const ctx = await requireOwner(undefined, payload.bandId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  if (payload.gigs.length === 0) return { error: 'Não há gigs para importar.' };
  if (payload.gigs.length > MAX_GIGS) return { error: `Muitas gigs de uma vez (máximo ${MAX_GIGS}).` };

  const rows = payload.gigs.map((g) => ({
    title: cut(g.title, 120),
    start_time: /^\d{4}-\d{2}-\d{2}$/.test(g.date) && /^\d{2}:\d{2}$/.test(g.time) ? gigInstant(g.date, g.time) : null,
    end_time: g.endTime && /^\d{2}:\d{2}$/.test(g.endTime) && /^\d{4}-\d{2}-\d{2}$/.test(g.date) && /^\d{2}:\d{2}$/.test(g.time) ? endInstant(g.date, g.time, g.endTime) : null,
    gross_value: typeof g.fee === 'number' && g.fee >= 0 ? g.fee : 0,
    project: cut(g.project, 80),
    location: cut(g.location, 200) ?? 'A definir',
    notes: cut(g.notes, 500),
  }));
  if (rows.some((r) => !r.title || !r.start_time || Number.isNaN(Date.parse(r.start_time)))) return { error: 'Toda gig precisa de nome, data e horário.' };

  const [{ data: projectRows }, { data: defaultSetlist }] = await Promise.all([
    supabase.from('go_projects').select('id, name').eq('band_id', bandId) as unknown as Promise<{ data: { id: string; name: string }[] | null }>,
    supabase.from('setlists').select('id').eq('band_id', bandId).eq('scope', 'band').eq('is_default', true).maybeSingle() as unknown as Promise<{ data: { id: string } | null }>,
  ]);
  const projectIds = new Map((projectRows ?? []).map((p) => [p.name.trim().toLowerCase(), p.id]));
  const defaultProjectId = payload.defaultProjectId && (projectRows ?? []).some((p) => p.id === payload.defaultProjectId) ? payload.defaultProjectId : null;
  if (rows.some((r) => !r.project && !defaultProjectId)) return { error: 'Escolha um projeto para as gigs que não indicam a banda.' };

  // Projects named in the list that the band does not have yet: create them once each.
  const missing = [...new Map(rows.filter((r) => r.project && !projectIds.has(r.project.toLowerCase())).map((r) => [r.project!.toLowerCase(), r.project!])).values()];
  if (missing.length > 0) {
    const { data: made, error: projectError } = await supabase
      .from('go_projects')
      .insert(missing.map((name, i) => ({ name, color_hex: PROJECT_COLORS[((projectRows?.length ?? 0) + i) % PROJECT_COLORS.length], band_id: bandId })))
      .select('id, name');
    if (projectError || !made) {
      console.error('Error creating projects for import:', projectError);
      return { error: projectError?.message ?? 'Não foi possível criar os projetos.' };
    }
    for (const p of made) projectIds.set(p.name.trim().toLowerCase(), p.id);
  }

  const times = rows.map((r) => Date.parse(r.start_time!));
  const { data: existing } = await supabase
    .from('go_gigs')
    .select('title, start_time')
    .eq('band_id', bandId)
    .gte('start_time', new Date(Math.min(...times)).toISOString())
    .lte('start_time', new Date(Math.max(...times)).toISOString());
  const seen = new Set((existing ?? []).map((e) => `${String(e.title).trim().toLowerCase()}|${Date.parse(e.start_time as string)}`));

  const toInsert = rows
    .filter((r) => !seen.has(`${r.title!.toLowerCase()}|${Date.parse(r.start_time!)}`))
    .map((r) => ({
      title: r.title,
      project_id: (r.project ? projectIds.get(r.project.toLowerCase()) : defaultProjectId)!,
      start_time: new Date(r.start_time!).toISOString(),
      end_time: r.end_time,
      gross_value: r.gross_value,
      location: r.location,
      notes: r.notes,
      bring_sound: false,
      sound_cost: 0,
      sound_person_id: null,
      is_sound_paid: false,
      event_type: null,
      client_name: null,
      recurrence_group_id: null,
      band_id: bandId,
      reminder_minutes: [],
      setlist_id: defaultSetlist?.id ?? null,
    }));
  const skipped = rows.length - toInsert.length;
  if (toInsert.length === 0) return { created: 0, skipped, projectsCreated: 0, settled: 0 };

  const { data: made, error } = await supabase.from('go_gigs').insert(toInsert).select('id, start_time, gross_value');
  if (error) {
    console.error('Error importing gigs:', error);
    return { error: error.message };
  }

  // Old gigs come in already settled: one receipt for the full cachê, dated the day of the show. A gig with no cachê
  // has nothing to receive (`gig_payments.amount` must be > 0), so it is simply left alone.
  const cutoff = startOfToday().getTime() - SETTLED_AFTER_DAYS * 86_400_000;
  const receipts = (made ?? [])
    .filter((g) => Date.parse(g.start_time as string) < cutoff && Number(g.gross_value) > 0)
    .map((g) => ({ band_id: bandId, gig_id: g.id as string, amount: Number(g.gross_value), paid_at: dayKey(g.start_time as string), note: 'Recebido (importação da lista)' }));
  if (receipts.length > 0) {
    const { error: receiptError } = await supabase.from('gig_payments').insert(receipts);
    // The gigs are already in the agenda: a receipt that fails is worth a log, not an import rolled back.
    if (receiptError) console.error('Error settling imported gigs:', receiptError);
  }

  await logAction('gigs_importadas', ctx.userId, bandId);
  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  revalidatePath('/projects');
  revalidatePath('/relatorio');
  return { created: toInsert.length, skipped, projectsCreated: missing.length, settled: receipts.length };
}
