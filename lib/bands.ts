import { createAdminClient } from '@/lib/supabase/admin';

/** Band lifecycle helpers. They use the service role: membership rows are never written from the browser. */

const clean = (name: string) => name.trim().slice(0, 60);

export async function createBandFor(userId: string, name: string): Promise<{ bandId: string } | { error: string }> {
  const admin = createAdminClient();

  const { data: band, error } = await admin
    .from('bands')
    .insert({ name: clean(name) || 'Minha banda' })
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
