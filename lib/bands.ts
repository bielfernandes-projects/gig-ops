import { createAdminClient } from '@/lib/supabase/admin';

/** Band lifecycle helpers. They use the service role: membership rows are never written from the browser. */

const clean = (name: string) => name.trim().slice(0, 60);

const DAY_MS = 86_400_000;

/** Referral credit: +30 days on the referrer's trial or paid period. Best effort, never blocks sign-up. */
async function grantReferralCredit(referrerId: string) {
  const admin = createAdminClient();
  const { data: sub } = await admin.from('subscriptions').select('status, trial_ends_at, paid_until').eq('band_id', referrerId).maybeSingle();
  if (!sub) return;
  const now = Date.now();
  const extend = (iso: string | null) => new Date(Math.max(iso ? new Date(iso).getTime() : 0, now) + 30 * DAY_MS).toISOString();
  const patch = sub.status === 'active' && sub.paid_until ? { paid_until: extend(sub.paid_until) } : { status: 'trial', trial_ends_at: extend(sub.trial_ends_at) };
  await admin.from('subscriptions').update(patch).eq('band_id', referrerId);
}

export async function createBandFor(userId: string, name: string, referralCode?: string): Promise<{ bandId: string } | { error: string }> {
  const admin = createAdminClient();

  let referrerId: string | null = null;
  const code = referralCode?.trim().toUpperCase();
  if (code) {
    const { data: ref } = await admin.from('bands').select('id').eq('invite_code', code).maybeSingle();
    if (!ref) return { error: 'Código de indicação inválido.' };
    referrerId = ref.id;
  }

  const { data: band, error } = await admin
    .from('bands')
    .insert({ name: clean(name) || 'Minha banda', referred_by: referrerId })
    .select('id')
    .single();
  if (error || !band) return { error: 'Não foi possível criar a banda. Tente novamente.' };

  const results = await Promise.all([
    admin.from('band_members').insert({ band_id: band.id, user_id: userId, role: 'owner' }),
    admin.from('subscriptions').insert({ band_id: band.id }),
  ]);
  if (results.some((r) => r.error)) {
    await admin.from('bands').delete().eq('id', band.id); // cascades to the rows above
    return { error: 'Não foi possível criar a banda. Tente novamente.' };
  }
  if (referrerId) await grantReferralCredit(referrerId);
  return { bandId: band.id };
}

/** Adds the person to the band that owns this invite code (as a member; an existing role is kept). */
export async function joinBandByCode(
  userId: string,
  rawCode: string
): Promise<{ bandId: string; bandName: string } | { error: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: 'Informe o código de convite.' };

  const admin = createAdminClient();
  const { data: band } = await admin.from('bands').select('id, name').eq('invite_code', code).maybeSingle();
  if (!band) return { error: 'Código de convite inválido.' };

  const { error } = await admin
    .from('band_members')
    .upsert({ band_id: band.id, user_id: userId, role: 'member' }, { onConflict: 'band_id,user_id', ignoreDuplicates: true });
  if (error) return { error: 'Não foi possível entrar na banda. Tente novamente.' };

  return { bandId: band.id, bandName: band.name };
}

/** Name to show for a person: their display name, else their e-mail. */
export async function nameOf(userId: string, fallbackEmail?: string | null): Promise<string> {
  const { data } = await createAdminClient().from('go_profiles').select('display_name').eq('id', userId).maybeSingle();
  return (data?.display_name as string | null) || fallbackEmail || 'Um músico';
}
