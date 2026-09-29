'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserInfo } from '@/lib/auth';
import { premiumNoticeAction } from '@/lib/subscription';

/**
 * Names of the Bandas (owned by the current person) that just became Premium and were not announced
 * yet. Looks only at the final state, so it doesn't matter how the Banda got there: Stripe webhook,
 * admin panel button or a direct database change. The flag is claimed with a conditional update, so
 * two tabs opening at once announce it only once. Bandas that left Premium get their flag cleared.
 * Service role because `subscriptions` takes no writes from the browser (RLS).
 */
export async function claimPremiumNotice(): Promise<{ bands: string[] }> {
  const info = await getUserInfo();
  const owned = info.memberships.filter((m) => m.role === 'owner');
  if (!info.userId || owned.length === 0) return { bands: [] };

  const admin = createAdminClient();
  const { data } = (await admin
    .from('subscriptions')
    .select('band_id, premium_seen_at')
    .in('band_id', owned.map((m) => m.bandId))) as unknown as { data: { band_id: string; premium_seen_at: string | null }[] | null };

  const show: string[] = [];
  const reset: string[] = [];
  for (const row of data ?? []) {
    const state = info.bands[row.band_id]?.subscription.state;
    if (!state) continue;
    const action = premiumNoticeAction(state, row.premium_seen_at);
    if (action === 'show') show.push(row.band_id);
    if (action === 'reset') reset.push(row.band_id);
  }

  if (reset.length > 0) await admin.from('subscriptions').update({ premium_seen_at: null }).in('band_id', reset);
  if (show.length === 0) return { bands: [] };

  const { data: claimed } = (await admin
    .from('subscriptions')
    .update({ premium_seen_at: new Date().toISOString() })
    .in('band_id', show)
    .is('premium_seen_at', null)
    .select('band_id')) as unknown as { data: { band_id: string }[] | null };

  return { bands: (claimed ?? []).map((r) => info.bands[r.band_id]?.name ?? 'Banda') };
}
