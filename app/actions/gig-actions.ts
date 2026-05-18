'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPushToMember } from './push-actions';

export async function addQuickGig(formData: FormData) {
  const title = formData.get('title') as string;
  const project_id = formData.get('project_id') as string;
  const start_time = formData.get('start_time') as string;
  const end_time = (formData.get('end_time') as string) || null;
  const grossValueStr = formData.get('gross_value') as string;
  const notes = (formData.get('notes') as string) || null;
  const clone_id = formData.get('clone_id') as string;
  const recurrence = formData.get('recurrence') as string;
  const recurrence_end = formData.get('recurrence_end') as string;
  const custom_end_date = formData.get('custom_end_date') as string;
  
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
  let currentStart = new Date(startDt);

  // Gera as datas recorrentes e/ou apenas a gig isolada
  while (true) {
    gigsToInsert.push({
      title,
      project_id,
      start_time: currentStart.toISOString(),
      end_time: endDt ? new Date(currentStart.getTime() + durationMs).toISOString() : null,
      gross_value,
      location: originalGig ? originalGig.location : 'A definir',
      bring_sound: originalGig ? originalGig.bring_sound : false,
      sound_cost: originalGig ? originalGig.sound_cost : 0,
      sound_person_id: originalGig ? originalGig.sound_person_id : null,
      notes,
      is_sound_paid: false,
      recurrence_group_id
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

  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateGig(formData: FormData) {
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
    .eq('id', id);

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
  const { data: currentGig } = await supabase.from('go_gigs').select('*').eq('id', gigId).single();
  if (!currentGig) return { error: 'Show não encontrado.' };

  let query = supabase.from('go_gigs').select('id');
  
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
  const gig_id = formData.get('gig_id') as string;
  let member_id = formData.get('musician_id') as string | null; // from hidden input
  const feeStr = formData.get('agreed_fee') as string; // from input name
  const custom_name = formData.get('musician_name') as string;
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

  // Fire push notification non-blocking (never breaks main flow)
  if (member_id) {
    try {
      await sendPushToMember(member_id, {
        title: 'Nova Gig Escalada! 🎸',
        body: 'Você foi escalado para um novo show. Abra o app para ver os detalhes.',
        url: `/gigs/${gig_id}`,
      });
    } catch (e) {
      console.warn('Push notification failed silently:', e);
    }
  }

  return { success: true };
}

export async function togglePaymentStatus(lineupId: string, targetIsPaid: boolean) {
  const newStatus = targetIsPaid ? 'pago' : 'pendente';
  
  // Grab lineup info to know who to notify and the gig title
  const { data: lineupData } = await supabase
    .from('go_lineup')
    .select(`
      member_id,
      gig_id,
      go_gigs ( title )
    `)
    .eq('id', lineupId)
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
  const lineupId = formData.get('lineup_id') as string;
  const gigId = formData.get('gig_id') as string;
  const feeStr = formData.get('agreed_fee') as string;

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
  const { error } = await supabase
    .from('go_gigs')
    .update({ is_sound_paid: targetIsPaid })
    .eq('id', gigId);

  if (error) {
    console.error('Error updating sound payment status:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath('/agenda');
  revalidatePath('/dashboard');
  return { success: true };
}
