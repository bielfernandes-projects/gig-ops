'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPushToMember } from './push-actions';
import { getUserInfo } from '@/lib/auth';

export async function addQuickGig(formData: FormData) {
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();
  
  const title = formData.get('title') as string;
  const project_id = formData.get('project_id') as string;
  const start_time = formData.get('start_time') as string;
  const end_time = (formData.get('end_time') as string) || null;
  const grossValueStr = formData.get('gross_value') as string;
  const notes = (formData.get('notes') as string) || null;
  
  if (!title || !project_id || !start_time) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const gross_value = parseFloat(grossValueStr) || 0;
  
  const insertData: any = { 
    title, 
    project_id, 
    start_time, 
    end_time,
    gross_value,
    location: 'A definir',
    bring_sound: false,
    sound_cost: 0,
    notes,
    is_sound_paid: false,
  };
  
  // NOVO: Salvar admin_id se for admin
  if (role === 'admin' && userId) {
    insertData.admin_id = userId;
  }
  
  const { error } = await supabase
    .from('go_gigs')
    .insert([insertData]);

  if (error) {
    console.error('Error inserting gig:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateGig(formData: FormData) {
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();
  
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

  // NOVO: Verificar se o gig pertence ao admin
  let query = supabase.from('go_gigs').update({ title, project_id, start_time, end_time, location, gross_value, bring_sound, sound_cost, sound_person_id, notes, is_sound_paid }).eq('id', id);
  if (role === 'admin' && userId) {
    query = query.eq('admin_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error updating gig:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath(`/gigs/${id}`);
  return { success: true };
}

export async function cancelGig(gigId: string, reason: string) {
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

  // NOVO: Verificar se o gig pertence ao admin
  if (role === 'admin' && userId) {
    const { data } = await supabase.from('go_gigs').select('admin_id').eq('id', gigId).single();
    if (data?.admin_id !== userId) {
      return { error: 'Acesso negado: este gig não pertence a você.' };
    }
  }

  // 1. Fetch gig title + all lineup members in parallel
  const [gigResult, lineupResult] = await Promise.all([
    supabase.from('go_gigs').select('title').eq('id', gigId).single(),
    supabase.from('go_lineup').select('member_id').eq('gig_id', gigId),
  ]);

  const gigTitle = gigResult.data?.title || 'Show';
  const memberIds = (lineupResult.data || []).map(l => l.member_id);

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
  await supabase.from('go_lineup').delete().eq('gig_id', gigId);

  let deleteQuery = supabase.from('go_gigs').delete().eq('id', gigId);
  if (role === 'admin' && userId) {
    deleteQuery = deleteQuery.eq('admin_id', userId);
  }
  const { error } = await deleteQuery;

  if (error) {
    console.error('Error deleting gig:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  redirect('/');
}

export async function addMemberToLineup(formData: FormData) {
  const gig_id = formData.get('gig_id') as string;
  const member_id = formData.get('musician_id') as string; // from select name
  const feeStr = formData.get('agreed_fee') as string; // from input name

  if (!gig_id || !member_id) {
    return { error: 'Campos obrigatórios faltando.' };
  }

  const fee_amount = parseFloat(feeStr) || 0;

  const { error } = await supabase
    .from('go_lineup')
    .insert([
      { gig_id, member_id, fee_amount, status: 'pendente' }
    ]);

  if (error) {
    console.error('Error adding member to lineup:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gig_id}`);

  // Fire push notification non-blocking (never breaks main flow)
  try {
    await sendPushToMember(member_id, {
      title: 'Nova Gig Escalada! 🎸',
      body: 'Você foi escalado para um novo show. Abra o app para ver os detalhes.',
      url: `/gigs/${gig_id}`,
    });
  } catch (e) {
    console.warn('Push notification failed silently:', e);
  }

  return { success: true };
}

export async function togglePaymentStatus(lineupId: string, targetIsPaid: boolean) {
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

  // NOVO: Verificar se a lineup pertence a um gig do admin
  if (role === 'admin' && userId) {
    const { data: lineupData } = await supabase
      .from('go_lineup')
      .select('gig_id, go_gigs!inner(admin_id)')
      .eq('id', lineupId)
      .single();
    
    const gigAdminId = (lineupData as any)?.go_gigs?.admin_id;
    if (gigAdminId !== userId) {
      return { error: 'Acesso negado: este registro não pertence a você.' };
    }
  }

  const newStatus = targetIsPaid ? 'pago' : 'pendente';
  
  const { error } = await supabase
    .from('go_lineup')
    .update({ status: newStatus })
    .eq('id', lineupId);

  if (error) {
    console.error('Error updating payment status:', error);
    return { error: error.message };
  }

  // Next.js App Router layout path dynamic revalidation rule
  revalidatePath('/gigs/[id]', 'page');
  return { success: true };
}

export async function removeFromLineup(lineupId: string, gigId: string) {
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

  // NOVO: Verificar se a lineup pertence a um gig do admin
  if (role === 'admin' && userId) {
    const { data: lineupData } = await supabase
      .from('go_lineup')
      .select('gig_id, go_gigs!inner(admin_id)')
      .eq('id', lineupId)
      .single();
    
    const gigAdminId = (lineupData as any)?.go_gigs?.admin_id;
    if (gigAdminId !== userId) {
      return { error: 'Acesso negado: este registro não pertence a você.' };
    }
  }

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
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

  const lineupId = formData.get('lineup_id') as string;
  const gigId = formData.get('gig_id') as string;
  const feeStr = formData.get('agreed_fee') as string;

  if (!lineupId || !gigId) {
    return { error: 'Dados inválidos.' };
  }

  // NOVO: Verificar se a lineup pertence a um gig do admin
  if (role === 'admin' && userId) {
    const { data: lineupData } = await supabase
      .from('go_lineup')
      .select('gig_id, go_gigs!inner(admin_id)')
      .eq('id', lineupId)
      .single();
    
    const gigAdminId = (lineupData as any)?.go_gigs?.admin_id;
    if (gigAdminId !== userId) {
      return { error: 'Acesso negado: este registro não pertence a você.' };
    }
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
  const supabase = await createClient();
  const { role, userId } = await getUserInfo();

  // Verificar se o gig pertence ao admin
  if (role === 'admin' && userId) {
    const { data } = await supabase.from('go_gigs').select('admin_id').eq('id', gigId).single();
    if (data?.admin_id !== userId) {
      return { error: 'Acesso negado: este gig não pertence a você.' };
    }
  }

  let query = supabase.from('go_gigs').update({ is_sound_paid: targetIsPaid }).eq('id', gigId);
  if (role === 'admin' && userId) {
    query = query.eq('admin_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error updating sound payment status:', error);
    return { error: error.message };
  }

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath('/');
  return { success: true };
}
