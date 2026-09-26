import { createAdminClient } from '@/lib/supabase/admin';

/** Band lifecycle helpers. They use the service role: membership rows are never written from the browser. */

const clean = (name: string) => name.trim().slice(0, 60);

/**
 * Invite codes (which double as referral codes) are up to 5 alphanumeric characters, written
 * uppercase — new bands get `upper(substr(md5(random()), 1, 5))`, owners can pick their own in
 * Perfil (`saveInviteCode`). Uniqueness is enforced on `upper(invite_code)`, so the stored case
 * is NOT guaranteed (rows migrated from `go_settings` kept whatever case they had) and lookups
 * have to be case-insensitive too — hence `ilike` instead of `eq`.
 */
export const normalizeCode = (raw: string) => raw.trim().toUpperCase();

/** Same, escaped for `ilike`: the column is free text, so `%`/`_` must not act as wildcards. */
export const codeFilter = (raw: string) => normalizeCode(raw).replace(/[\\%_]/g, (c) => `\\${c}`);

/** What to tell someone whose code didn't match anything. */
export const CODE_FORMAT_HINT = 'O código tem até 5 letras ou números, sem espaços nem acentos.';

/**
 * Checks a code someone typed for their own band (at creation, or when changing it in Perfil):
 * it has to fit the format and no *other* band can already use it. Uniqueness is case-insensitive
 * in the database, so the check has to be too. `exceptBandId` lets a band keep its current code.
 */
export async function validateInviteCode(raw: string, exceptBandId?: string): Promise<{ code: string } | { error: string }> {
  const code = normalizeCode(raw);
  if (!/^[A-Z0-9]{1,5}$/.test(code)) return { error: `Código de convite inválido. ${CODE_FORMAT_HINT}` };

  // Needs the service role: RLS hides the other bands, so the browser can't see a collision.
  const { data: taken } = await createAdminClient().from('bands').select('id').ilike('invite_code', codeFilter(code)).maybeSingle();
  if (taken && taken.id !== exceptBandId) return { error: `O código "${code}" já está em uso por outra banda. Escolha outro.` };

  return { code };
}

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

type CreateBandOptions = {
  /** Code the owner picked for their own band. Left out, the column default generates one. */
  inviteCode?: string;
  /** Invite code of the band that referred them — see `grantReferralCredit`. */
  referralCode?: string;
};

export async function createBandFor(userId: string, name: string, opts: CreateBandOptions = {}): Promise<{ bandId: string } | { error: string }> {
  const admin = createAdminClient();

  let referrerId: string | null = null;
  const referral = opts.referralCode ? normalizeCode(opts.referralCode) : '';
  if (referral) {
    const { data: ref } = await admin.from('bands').select('id').ilike('invite_code', codeFilter(referral)).maybeSingle();
    if (!ref) {
      return {
        error: `Não existe banda com o código de indicação "${referral}". Ele é o código de convite da banda de quem te indicou (aparece no Perfil dessa pessoa). ${CODE_FORMAT_HINT} Se ninguém te indicou, deixe o campo vazio.`,
      };
    }
    referrerId = ref.id;
  }

  // Empty invite code: leave the column out entirely so the database default generates one.
  let ownCode: string | undefined;
  if (opts.inviteCode?.trim()) {
    const checked = await validateInviteCode(opts.inviteCode);
    if ('error' in checked) return checked;
    ownCode = checked.code;
  }

  const { data: band, error } = await admin
    .from('bands')
    .insert({ name: clean(name) || 'Minha banda', referred_by: referrerId, ...(ownCode ? { invite_code: ownCode } : {}) })
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
  const code = normalizeCode(rawCode);
  if (!code) return { error: 'Informe o código de convite.' };

  const admin = createAdminClient();
  const { data: band } = await admin.from('bands').select('id, name').ilike('invite_code', codeFilter(code)).maybeSingle();
  if (!band) return { error: `Nenhuma banda usa o código "${code}". Confirme com o responsável da banda. ${CODE_FORMAT_HINT}` };

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
