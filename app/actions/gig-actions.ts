'use server';

import { bandOfLineup, requireOwner, requireOwnerFor } from '@/lib/auth';
import { findConflicts } from '@/lib/conflicts';
import { PAID } from '@/lib/gig-view';
import { advance, daysInMonth, endOfDayKey, toInstant, wallClock, type Cadence } from '@/lib/time';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/telemetry';
import { redirect } from 'next/navigation';
import { sendPushToMember } from '@/lib/push';

export async function addQuickGig(formData: FormData) {
  const ctx = await requireOwner(undefined, formData.get('band_id') as string | null);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const title = formData.get('title') as string;
  const project_id = formData.get('project_id') as string;
  const start_time = formData.get('start_time') as string;
  const end_time = (formData.get('end_time') as string) || null;
  const grossValueStr = formData.get('gross_value') as string;
  const location = (formData.get('location') as string) || 'A definir';
  const notes = (formData.get('notes') as string) || null;
  const event_type = ((formData.get('event_type') as string) || '').trim() || null;
  const client_name = ((formData.get('client_name') as string) || '').trim() || null;
  const clone_id = formData.get('clone_id') as string;
  const recurrence = formData.get('recurrence') as string;
  const recurrence_end = formData.get('recurrence_end') as string;
  const custom_end_date = formData.get('custom_end_date') as string;

  // Sound equipment fields
  const bring_sound = formData.get('bring_sound') === 'true';
  const sound_cost = bring_sound ? (parseFloat(formData.get('sound_cost') as string) || 0) : 0;
  const rawSoundPerson = formData.get('sound_person_id') as string;
  const sound_person_id = bring_sound && rawSoundPerson ? rawSoundPerson : null;

  // Lineup data (JSON array of { member_id, custom_name, custom_instrument, fee_amount })
  const lineupRaw = formData.get('lineup') as string;
  let lineupData: { member_id?: string | null; custom_name?: string | null; custom_instrument?: string | null; fee_amount: number }[] = [];
  if (lineupRaw) {
    try { lineupData = JSON.parse(lineupRaw); } catch { /* ignore bad JSON */ }
  }

  // Reminder minutes (JSON array of numbers)
  const reminderRaw = formData.get('reminder_minutes') as string;
  let reminderMinutes: number[] = [];
  if (reminderRaw) {
    try { reminderMinutes = JSON.parse(reminderRaw); } catch { /* ignore bad JSON */ }
  }
  
  if (!title || !project_id || !start_time) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const gross_value = parseFloat(grossValueStr) || 0;
  let warnings: string[] = [];

  // Recupera propriedades completas da gig original em caso de clone profundo
  let originalGig = null;
  if (clone_id) {
    const { data } = await supabase.from('go_gigs').select('*').eq('id', clone_id).eq('band_id', bandId).single();
    if (!data) return { error: 'Show original não encontrado.' };
    originalGig = data;
  }

  // Até quando a recorrência vai. Contado no calendário brasileiro, não no fuso do servidor.
  const isRecurring = !!recurrence && recurrence !== 'none';
  let endRecurrenceDate: Date | null = null;
  if (isRecurring) {
    const months = { '1month': 1, '3months': 3, '6months': 6, '1year': 12 }[recurrence_end];
    if (months) {
      const w = wallClock(start_time);
      const totalMonths = w.month - 1 + months;
      const year = w.year + Math.floor(totalMonths / 12);
      const month = (totalMonths % 12) + 1;
      endRecurrenceDate = toInstant(year, month, Math.min(w.day, daysInMonth(year, month)), 23, 59);
    } else if (recurrence_end === 'custom' && custom_end_date) {
      endRecurrenceDate = endOfDayKey(custom_end_date);
    }
  }

  const recurrence_group_id = isRecurring ? crypto.randomUUID() : null;

  const startDt = new Date(start_time);
  const endDt = end_time ? new Date(end_time) : null;
  const durationMs = endDt ? endDt.getTime() - startDt.getTime() : 0;

  // clone herda o repertorio do show original; so shows novos pegam o principal da banda
  const defaultSetlist = clone_id
    ? null
    : (await supabase.from('setlists').select('id').eq('band_id', bandId).eq('scope', 'band').eq('is_default', true).maybeSingle()).data;

  const gigsToInsert = [];
  let currentStart = new Date(startDt);

  // Gera as datas recorrentes e/ou apenas a gig isolada
  while (true) {
    gigsToInsert.push({
      title,
      project_id,
      start_time: currentStart.toISOString(),
      end_time: endDt ? new Date(currentStart.getTime() + durationMs).toISOString() : null,
      gross_value,
      location: originalGig ? originalGig.location : location,
      bring_sound: originalGig ? originalGig.bring_sound : bring_sound,
      sound_cost: originalGig ? originalGig.sound_cost : sound_cost,
      sound_person_id: originalGig ? originalGig.sound_person_id : sound_person_id,
      notes,
      event_type,
      client_name,
      is_sound_paid: false,
      recurrence_group_id,
      band_id: bandId,
      reminder_minutes: reminderMinutes.length > 0 ? reminderMinutes : [],
      setlist_id: originalGig ? originalGig.setlist_id : (defaultSetlist?.id ?? null),
    });

    if (!isRecurring || !endRecurrenceDate) break;

    currentStart = advance(currentStart, recurrence as Cadence);
    if (currentStart > endRecurrenceDate) break;
  }

  // start_time volta junto porque cada ocorrência tem a sua — os lembretes são por ocorrência.
  const { data: insertedGigs, error } = await supabase
    .from('go_gigs')
    .insert(gigsToInsert)
    .select('id, start_time');

  if (error) {
    console.error('Error inserting gig:', error);
    return { error: error.message };
  }

  // Em caso de cópia (Duplicação), puxamos a Lineup Original e a replicamos para a(s) nova(s) Gig(s)
  if (clone_id && insertedGigs) {
    const { data: lineups } = await supabase.from('go_lineup').select('*').eq('gig_id', clone_id);
    if (lineups && lineups.length > 0) {
      const newLineups = [];
      for (const gig of insertedGigs) {
        for (const l of lineups) {
          newLineups.push({
            gig_id: gig.id,
            member_id: l.member_id,
            fee_amount: l.fee_amount,
            custom_name: l.custom_name,
            custom_instrument: l.custom_instrument,
            status: 'pendente'
          });
        }
      }
      await supabase.from('go_lineup').insert(newLineups);
    }
  }

  // Escala vinda do formulário — em TODAS as ocorrências, não só na primeira.
  if (!clone_id && lineupData.length > 0 && insertedGigs && insertedGigs.length > 0) {
    const newLineups = insertedGigs.flatMap(gig =>
      lineupData.map(l => ({
        gig_id: gig.id,
        member_id: l.member_id || null,
        fee_amount: l.fee_amount || 0,
        custom_name: l.member_id ? null : (l.custom_name || null),
        custom_instrument: l.member_id ? null : (l.custom_instrument || null),
        status: 'pendente' as const,
      }))
    );
    await supabase.from('go_lineup').insert(newLineups);

    // Double-booking warnings (never block the gig) — checados na primeira ocorrência.
    try {
      const memberIds = lineupData.map((l) => l.member_id).filter(Boolean) as string[];
      warnings = Object.values(await findConflicts(insertedGigs[0].id, memberIds)).map((w) => w[0]);
    } catch (e) {
      console.warn('Conflict check failed:', e);
    }
  }

  // Lembretes: cada ocorrência tem os seus, contados a partir do próprio horário dela.
  if (reminderMinutes.length > 0 && insertedGigs && insertedGigs.length > 0) {
    const remindersToInsert = insertedGigs.flatMap(gig =>
      reminderMinutes.map(minutes => ({
        gig_id: gig.id,
        remind_at: new Date(new Date(gig.start_time).getTime() - minutes * 60 * 1000).toISOString(),
      }))
    );
    await supabase.from('go_reminders').insert(remindersToInsert);
  }

  await logAction('gig_criado', ctx.userId, bandId);

  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true, warnings };
}

export async function updateGig(formData: FormData) {
  const ctx = await requireOwnerFor('go_gigs', formData.get('id') as string);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const project_id = formData.get('project_id') as string;
  const start_time = formData.get('start_time') as string;
  const end_time = (formData.get('end_time') as string) || null;
  const location = formData.get('location') as string;
  const gross_value = parseFloat(formData.get('gross_value') as string) || 0;
  const bring_sound = formData.get('bring_sound') === 'true';
  const sound_cost = bring_sound ? (parseFloat(formData.get('sound_cost') as string) || 0) : 0;
  const rawSoundPerson = formData.get('sound_person_id') as string;
  const sound_person_id = bring_sound && rawSoundPerson ? rawSoundPerson : null;
  const notes = (formData.get('notes') as string) || null;
  const event_type = ((formData.get('event_type') as string) || '').trim() || null;
  const client_name = ((formData.get('client_name') as string) || '').trim() || null;
  const is_sound_paid = formData.get('is_sound_paid') === 'true';

  if (!id || !title || !project_id || !start_time) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const { error } = await supabase
    .from('go_gigs')
    .update({ title, project_id, start_time, end_time, location, gross_value, bring_sound, sound_cost, sound_person_id, notes, event_type, client_name, is_sound_paid })
    .eq('id', id)
    .eq('band_id', bandId);

  if (error) {
    console.error('Error updating gig:', error);
    return { error: error.message };
  }

  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  revalidatePath(`/gigs/${id}`);
  return { success: true };
}

export async function cancelGig(gigId: string, reason: string, deleteMode: 'single' | 'future' | 'all' = 'single') {
  const ctx = await requireOwnerFor('go_gigs', gigId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const { data: currentGig } = await supabase.from('go_gigs').select('*').eq('id', gigId).eq('band_id', bandId).single();
  if (!currentGig) return { error: 'Show não encontrado.' };

  let query = supabase.from('go_gigs').select('id').eq('band_id', bandId);
  
  if (currentGig.recurrence_group_id && deleteMode !== 'single') {
    query = query.eq('recurrence_group_id', currentGig.recurrence_group_id);
    if (deleteMode === 'future') {
      query = query.gte('start_time', currentGig.start_time);
    }
  } else {
    query = query.eq('id', gigId);
  }

  const { data: targetGigs } = await query;
  if (!targetGigs || targetGigs.length === 0) return { error: 'Nenhum show localizado para exclusão.' };

  const gigIdsToDelete = targetGigs.map(g => g.id);
  const gigTitle = currentGig.title || 'Show';

  const { data: lineups } = await supabase.from('go_lineup').select('member_id').in('gig_id', gigIdsToDelete);
  const memberIds = [...new Set((lineups || []).map(l => l.member_id).filter(Boolean))] as string[];

  // 2. Send push notifications to all lineup members (fire & forget)
  if (memberIds.length > 0) {
    try {
      await Promise.allSettled(
        memberIds.map(memberId =>
          sendPushToMember(memberId, {
            title: `Gig Cancelada: ${gigTitle}`,
            body: `Motivo: ${reason}`,
          })
        )
      );
    } catch (e) {
      console.warn('Push notifications failed silently during cancellation:', e);
    }
  }

  // 3. Delete lineup entries first, then the gig
  await supabase.from('go_lineup').delete().in('gig_id', gigIdsToDelete);

  const { error } = await supabase.from('go_gigs').delete().in('id', gigIdsToDelete);

  if (error) {
    console.error('Error deleting gig:', error);
    return { error: error.message };
  }

  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  redirect('/agenda');
}

export async function addMemberToLineup(formData: FormData) {
  const ctx = await requireOwnerFor('go_gigs', formData.get('gig_id') as string);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase } = ctx;

  const gig_id = formData.get('gig_id') as string;
  let member_id = formData.get('member_id') as string | null;
  const feeStr = formData.get('fee_amount') as string;
  const custom_name = formData.get('custom_name') as string;
  const custom_instrument = formData.get('custom_instrument') as string;

  if (!gig_id || (!member_id && !custom_name)) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  if (!member_id) member_id = null;

  const fee_amount = parseFloat(feeStr) || 0;

  const { error } = await supabase
    .from('go_lineup')
    .insert([
      { 
        gig_id, member_id, fee_amount, status: 'pendente',
        custom_name: member_id ? null : custom_name,
        custom_instrument: member_id ? null : custom_instrument
      }
    ]);

  if (error) {
    console.error('Error adding member to lineup:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gig_id}`);
  revalidatePath('/agenda');

  // Double-booking warning (never blocks the lineup)
  let warning: string | undefined;
  if (member_id) {
    try {
      warning = (await findConflicts(gig_id, [member_id]))[member_id]?.[0];
    } catch (e) {
      console.warn('Conflict check failed:', e);
    }
  }

  // Fire push notification non-blocking (never breaks main flow)
  if (member_id) {
    try {
      await sendPushToMember(member_id, {
        title: 'Nova Gig Escalada! 🎸',
        body: 'Você foi escalado para um novo show. Abra o app para ver os detalhes e adicionar ao seu calendário.',
        url: `/gigs/${gig_id}`,
      });
    } catch (e) {
      console.warn('Push notification failed silently:', e);
    }
  }

  return { success: true, warning };
}

export async function togglePaymentStatus(lineupId: string, targetIsPaid: boolean) {
  const ctx = await requireOwner(undefined, await bandOfLineup(lineupId));
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const newStatus = targetIsPaid ? PAID : 'pendente';
  
  // Grab lineup info to know who to notify and the gig title
  const { data: lineupData } = await supabase
    .from('go_lineup')
    .select(`
      member_id,
      gig_id,
      go_gigs!inner ( title, band_id )
    `)
    .eq('id', lineupId)
    .eq('go_gigs.band_id', bandId)
    .single();

  const { error } = await supabase
    .from('go_lineup')
    .update({ status: newStatus })
    .eq('id', lineupId);

  if (error) {
    console.error('Error updating payment status:', error);
    return { error: error.message };
  }

  // Push Notification on Payment!
  if (targetIsPaid && lineupData?.member_id) {
    // The embedded row comes back as an object or a single-item array, depending on how
    // supabase-js infers the relationship.
    const gig = lineupData.go_gigs as { title: string } | { title: string }[] | null;
    const gigTitle = (Array.isArray(gig) ? gig[0]?.title : gig?.title) || 'um show';
    
    try {
      await sendPushToMember(lineupData.member_id, {
        title: 'Cachê na conta! 💸',
        body: `Seu pagamento do show ${gigTitle} foi confirmado no Gigueiros.`,
        url: `/gigs/${lineupData.gig_id}`,
      });
    } catch (e) {
      console.warn('Push notification failed silently on payment:', e);
    }
  }

  if (targetIsPaid) await logAction('cache_pago', ctx.userId, bandId);

  // Next.js App Router layout path dynamic revalidation rule
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}

export async function removeFromLineup(lineupId: string, gigId: string) {
  const ctx = await requireOwnerFor('go_gigs', gigId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase } = ctx;

  const { error } = await supabase
    .from('go_lineup')
    .delete()
    .eq('id', lineupId);

  if (error) {
    console.error('Error removing from lineup:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  return { success: true };
}

export async function updateLineupFee(formData: FormData) {
  const ctx = await requireOwnerFor('go_gigs', formData.get('gig_id') as string);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase } = ctx;

  const lineupId = formData.get('lineup_id') as string;
  const gigId = formData.get('gig_id') as string;
  const feeStr = formData.get('fee_amount') as string;

  if (!lineupId || !gigId) {
    return { error: 'Dados inválidos.' };
  }

  const fee_amount = parseFloat(feeStr) || 0;

  const { error } = await supabase
    .from('go_lineup')
    .update({ fee_amount })
    .eq('id', lineupId);

  if (error) {
    console.error('Error updating lineup fee:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  return { success: true };
}

export async function toggleSoundPayment(gigId: string, targetIsPaid: boolean) {
  const ctx = await requireOwnerFor('go_gigs', gigId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, bandId } = ctx;

  const { error } = await supabase
    .from('go_gigs')
    .update({ is_sound_paid: targetIsPaid })
    .eq('id', gigId)
    .eq('band_id', bandId);

  if (error) {
    console.error('Error updating sound payment status:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true };
}
