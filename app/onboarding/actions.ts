'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BAND_COOKIE } from '@/lib/auth';
import { createBandFor, joinBandByCode, nameOf } from '@/lib/bands';
import { setDisplayName } from '@/app/profile/actions';
import { sendPushToBandOwners } from '@/lib/push';
import { logAction } from '@/lib/telemetry';

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * "Seu nome" is optional and shared by both paths. Saved before the band work so the person is
 * never left with a band and no name — and so the "entrou na banda" push already uses the name.
 */
async function saveName(formData: FormData): Promise<{ error: string } | null> {
  const name = String(formData.get('displayName') ?? '').trim();
  if (!name) return null;
  const res = await setDisplayName(name);
  return res?.error ? { error: res.error } : null;
}

async function rememberBand(bandId: string) {
  (await cookies()).set(BAND_COOKIE, bandId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

/** First-time Google sign-ups have no band yet: this creates one and makes the caller its owner. */
export async function createBand(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const named = await saveName(formData);
  if (named) return named;

  const created = await createBandFor(user.id, String(formData.get('bandName') ?? ''), {
    inviteCode: String(formData.get('inviteCode') ?? ''),
  });
  if ('error' in created) return { error: created.error };

  await logAction('banda_criada', user.id, created.bandId);

  await rememberBand(created.bandId);
  redirect('/dashboard');
}

/** Links the caller (as a musician) to the band that owns the invite code. */
export async function joinBand(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const named = await saveName(formData);
  if (named) return named;

  const joined = await joinBandByCode(user.id, String(formData.get('inviteCode') ?? ''));
  if ('error' in joined) return { error: joined.error };

  await sendPushToBandOwners(joined.bandId, {
    title: 'Novo músico na banda',
    body: `${await nameOf(user.id, user.email)} entrou usando o código de convite.`,
  });

  await logAction('entrou_na_banda', user.id, joined.bandId);

  await rememberBand(joined.bandId);
  redirect('/dashboard');
}
