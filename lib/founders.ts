import { createAdminClient } from '@/lib/supabase/admin';

/** How many bands hold the founder price (server-only: uses the service role). */
export async function countFounders(): Promise<number> {
  try {
    const { count } = await createAdminClient().from('subscriptions').select('band_id', { count: 'exact', head: true }).eq('price_plan', 'founder');
    return count ?? 0;
  } catch {
    return 0;
  }
}
