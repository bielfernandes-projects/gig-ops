'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserInfo } from '@/lib/auth';

/**
 * Remembers that the guided tour is done, so it doesn't come back on the person's next device.
 * `localStorage` still holds the same fact locally (see `components/app-tour.tsx`); this is the
 * copy that travels with the account. Written with the service role because `go_profiles` takes
 * no writes from the browser (RLS, `supabase/migrations/20260921000001_enable_rls.sql`).
 */
export async function markTourSeen() {
  const info = await getUserInfo();
  if (!info.userId) return { error: 'Não autenticado.' };

  const { error } = await createAdminClient()
    .from('go_profiles')
    .update({ tour_seen_at: new Date().toISOString() })
    .eq('id', info.userId);

  if (error) {
    // Never surfaced: the tour is over either way, and localStorage already covers this device.
    console.error('markTourSeen failed:', error.message);
    return { error: 'Não foi possível salvar.' };
  }

  return { success: true };
}
