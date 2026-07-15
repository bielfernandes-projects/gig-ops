'use server';

import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPushToMember } from './push-actions';

async function requireAdmin() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  return user.id;
}

export async function addQuickGig(formData: FormData) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  const title = formData.get('title') as string;
  const project_id = formData.get('project_id') as string;
  const start_time = formData.get('start_time') as string;
  const end_time = (formData.get('end_time') as string) || null;
  const grossValueStr = formData.get('gross_value') as string;
  const location = (formData.get('location') as string) || 'A definir';
  const notes = (formData.get('notes') as string) || null;
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

  // Recupera propriedades completas da gig original em caso de clone profundo
  let originalGig = null;
  if (clone_id) {
    const { data } = await supabase.from('go_gigs').select('*').eq('id', clone_id).single();
    originalGig = data;
  }

  // Configuração da data limite de recorrência
  let endRecurrenceDate: Date | null = null;
  if (recurrence && recurrence !== 'none') {
    const start = new Date(start_time);
    endRecurrenceDate = new Date(start);
    if (recurrence_end === '1month') endRecurrenceDate.setMonth(endRecurrenceDate.getMonth() + 1);
    else if (recurrence_end === '3months') endRecurrenceDate.setMonth(endRecurrenceDate.getMonth() + 3);
    else if (recurrence_end === '6months') endRecurrenceDate.setMonth(endRecurrenceDate.getMonth() + 6);
    else if (recurrence_end === '1year') endRecurrenceDate.setFullYear(endRecurrenceDate.getFullYear() + 1);
    else if (recurrence_end === 'custom' && custom_end_date) {
      endRecurrenceDate = new Date(custom_end_date);
      endRecurrenceDate.setHours(23, 59, 59, 999);
    }
  }

  const recurrence_group_id = (recurrence && recurrence !== 'none') ? crypto.randomUUID() : null;

  const startDt = new Date(start_time);
  const endDt = end_time ? new Date(end_time) : null;
  const durationMs = endDt ? endDt.getTime() - startDt.getTime() : 0;

  const gigsToInsert = [];
  const currentStart = new Date(startDt);

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
      is_sound_paid: false,
      recurrence_group_id,
      admin_id: adminId,
      reminder_minutes: reminderMinutes.length > 0 ? reminderMinutes : [],
    });

    if (!recurrence || recurrence === 'none' || !endRecurrenceDate) break;

    if (recurrence === 'weekly') currentStart.setDate(currentStart.getDate() + 7);
    else if (recurrence === 'biweekly') currentStart.setDate(currentStart.getDate() + 14);
    else if (recurrence === 'monthly') currentStart.setMonth(currentStart.getMonth() + 1);

    if (currentStart > endRecurrenceDate) break;
  }

  const { data: insertedGigs, error } = await supabase
    .from('go_gigs')
    .insert(gigsToInsert)
    .select('id');

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

  // Insert lineup from the QuickAddGig form (if provided and not a clone)
  if (!clone_id && lineupData.length > 0 && insertedGigs && insertedGigs.length > 0) {
    const targetGigId = insertedGigs[0].id;
    const newLineups = lineupData.map(l => ({
      gig_id: targetGigId,
      member_id: l.member_id || null,
      fee_amount: l.fee_amount || 0,
      custom_name: l.member_id ? null : (l.custom_name || null),
      custom_instrument: l.member_id ? null : (l.custom_instrument || null),
      status: 'pendente' as const,
    }));
    await supabase.from('go_lineup').insert(newLineups);
  }

  // Create reminder entries for the first gig (recurrence creates reminders per gig)
  if (reminderMinutes.length > 0 && insertedGigs && insertedGigs.length > 0) {
    const gigStart = new Date(start_time);
    const remindersToInsert = insertedGigs.flatMap(gig => {
      const gigStartDate = new Date(gig.id ? start_time : gigStart);
      return reminderMinutes.map(minutes => ({
        gig_id: gig.id,
        remind_at: new Date(gigStartDate.getTime() - minutes * 60 * 1000).toISOString(),
      }));
    });
    await supabase.from('go_reminders').insert(remindersToInsert);
  }

  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateGig(formData: FormData) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

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
  const is_sound_paid = formData.get('is_sound_paid') === 'true';

  if (!id || !title || !project_id || !start_time) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const { error } = await supabase
    .from('go_gigs')
    .update({ title, project_id, start_time, end_time, location, gross_value, bring_sound, sound_cost, sound_person_id, notes, is_sound_paid })
    .eq('id', id)
    .eq('admin_id', adminId);

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
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  const { data: currentGig } = await supabase.from('go_gigs').select('*').eq('id', gigId).eq('admin_id', adminId).single();
  if (!currentGig) return { error: 'Show não encontrado.' };

  let query = supabase.from('go_gigs').select('id').eq('admin_id', adminId);
  
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
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  const gig_id = formData.get('gig_id') as string;
  let member_id = formData.get('musician_id') as string | null;
  const feeStr = formData.get('agreed_fee') as string;
  const custom_name = formData.get('musician_name') as string;
  const custom_instrument = formData.get('custom_instrument') as string;

  if (!gig_id || (!member_id && !custom_name)) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  // Verify gig belongs to admin
  const { data: gig } = await supabase.from('go_gigs').select('id').eq('id', gig_id).eq('admin_id', adminId).single();
  if (!gig) return { error: 'Gig não encontrada.' };

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

  return { success: true };
}

export async function togglePaymentStatus(lineupId: string, targetIsPaid: boolean) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  const newStatus = targetIsPaid ? 'pago' : 'pendente';
  
  // Grab lineup info to know who to notify and the gig title
  const { data: lineupData } = await supabase
    .from('go_lineup')
    .select(`
      member_id,
      gig_id,
      go_gigs!inner ( title, admin_id )
    `)
    .eq('id', lineupId)
    .eq('go_gigs.admin_id', adminId)
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
    const gigTitle = (lineupData.go_gigs as any)?.title || 'um show';
    
    try {
      await sendPushToMember(lineupData.member_id, {
        title: 'Cachê na conta! 💸',
        body: `Seu pagamento do show ${gigTitle} foi confirmado no Minha Banda.`,
        url: `/gigs/${lineupData.gig_id}`,
      });
    } catch (e) {
      console.warn('Push notification failed silently on payment:', e);
    }
  }

  // Next.js App Router layout path dynamic revalidation rule
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}

export async function removeFromLineup(lineupId: string, gigId: string) {
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  // Verify gig belongs to admin
  const { data: gig } = await supabase.from('go_gigs').select('id').eq('id', gigId).eq('admin_id', adminId).single();
  if (!gig) return { error: 'Gig não encontrada.' };

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
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  const lineupId = formData.get('lineup_id') as string;
  const gigId = formData.get('gig_id') as string;
  const feeStr = formData.get('agreed_fee') as string;

  if (!lineupId || !gigId) {
    return { error: 'Dados inválidos.' };
  }

  // Verify gig belongs to admin
  const { data: gig } = await supabase.from('go_gigs').select('id').eq('id', gigId).eq('admin_id', adminId).single();
  if (!gig) return { error: 'Gig não encontrada.' };

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
  const adminId = await requireAdmin();
  if (!adminId) return { error: 'Não autenticado.' };

  const { error } = await supabase
    .from('go_gigs')
    .update({ is_sound_paid: targetIsPaid })
    .eq('id', gigId)
    .eq('admin_id', adminId);

  if (error) {
    console.error('Error updating sound payment status:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true };
}
