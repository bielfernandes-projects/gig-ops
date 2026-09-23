'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner, requireOwnerFor } from '@/lib/auth';

function money(value: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function refresh(gigId: string) {
  revalidatePath(`/gigs/${gigId}`);
  revalidatePath('/relatorio');
  revalidatePath('/dashboard');
}

/** Confirms the gig belongs to the band before touching its finances. */
async function ownGig(ctx: Extract<Awaited<ReturnType<typeof requireOwner>>, { ok: true }>, gigId: string) {
  const { data } = await ctx.supabase.from('go_gigs').select('id').eq('id', gigId).eq('band_id', ctx.bandId).maybeSingle();
  return !!data;
}

export async function addExpense(formData: FormData) {
  const ctx = await requireOwnerFor('go_gigs', String(formData.get('gig_id') ?? ''));
  if (!ctx.ok) return { error: ctx.error };

  const gigId = String(formData.get('gig_id') ?? '');
  const category = String(formData.get('category') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const amount = money(formData.get('amount'));

  if (!gigId || !category) return { error: 'Informe a categoria.' };
  if (amount === null || amount < 0) return { error: 'Informe um valor válido.' };
  if (!(await ownGig(ctx, gigId))) return { error: 'Show não encontrado.' };

  const { error } = await ctx.supabase
    .from('gig_expenses')
    .insert({ band_id: ctx.bandId, gig_id: gigId, category, description, amount });
  if (error) return { error: 'Não foi possível salvar a despesa.' };

  refresh(gigId);
  return { success: true };
}

export async function deleteExpense(id: string, gigId: string) {
  const ctx = await requireOwnerFor('go_gigs', gigId);
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase.from('gig_expenses').delete().eq('id', id).eq('band_id', ctx.bandId);
  if (error) return { error: 'Não foi possível remover a despesa.' };

  refresh(gigId);
  return { success: true };
}

/** Registers money received from the client (sinal, restante). Turns receipt tracking on for the gig. */
export async function addPayment(formData: FormData) {
  const ctx = await requireOwnerFor('go_gigs', String(formData.get('gig_id') ?? ''));
  if (!ctx.ok) return { error: ctx.error };

  const gigId = String(formData.get('gig_id') ?? '');
  const amount = money(formData.get('amount'));
  const paidAt = String(formData.get('paid_at') ?? '') || undefined;
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!gigId) return { error: 'Show inválido.' };
  if (amount === null || amount <= 0) return { error: 'Informe um valor maior que zero.' };
  if (!(await ownGig(ctx, gigId))) return { error: 'Show não encontrado.' };

  const { error } = await ctx.supabase
    .from('gig_payments')
    .insert({ band_id: ctx.bandId, gig_id: gigId, amount, paid_at: paidAt, note });
  if (error) return { error: 'Não foi possível salvar o recebimento.' };

  await ctx.supabase.from('go_gigs').update({ track_receipts: true }).eq('id', gigId).eq('band_id', ctx.bandId);

  refresh(gigId);
  return { success: true };
}

export async function deletePayment(id: string, gigId: string) {
  const ctx = await requireOwnerFor('go_gigs', gigId);
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase.from('gig_payments').delete().eq('id', id).eq('band_id', ctx.bandId);
  if (error) return { error: 'Não foi possível remover o recebimento.' };

  refresh(gigId);
  return { success: true };
}

export async function setTrackReceipts(gigId: string, on: boolean) {
  const ctx = await requireOwnerFor('go_gigs', gigId);
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from('go_gigs')
    .update({ track_receipts: on })
    .eq('id', gigId)
    .eq('band_id', ctx.bandId);
  if (error) return { error: 'Não foi possível alterar o controle de recebimentos.' };

  refresh(gigId);
  return { success: true };
}
