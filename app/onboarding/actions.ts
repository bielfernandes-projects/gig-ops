'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BAND_COOKIE } from '@/lib/auth';
import { createBandFor, joinBandByCode } from '@/lib/bands';
import { sendPushToBandOwners } from '@/lib/push';

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function rememberBand(bandId: string) {
  (await cookies()).set(BAND_COOKIE, bandId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

/** First-time Google sign-ups have no band yet: this creates one and makes the caller its owner. */
export async function createBand(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const created = await createBandFor(user.id, String(formData.get('bandName') ?? ''));
  if ('error' in created) return { error: created.error };

  await rememberBand(created.bandId);
  redirect('/dashboard');
}

/** Links the caller (as a musician) to the band that owns the invite code. */
export async function joinBand(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const joined = await joinBandByCode(user.id, String(formData.get('inviteCode') ?? ''));
  if ('error' in joined) return { error: joined.error };

  await sendPushToBandOwners(joined.bandId, {
    title: 'Novo músico na banda',
    body: `${user.email ?? 'Um músico'} entrou usando o código de convite.`,
  });

  await rememberBand(joined.bandId);
  redirect('/dashboard');
}
