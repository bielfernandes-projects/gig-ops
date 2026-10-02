import { createAdminClient } from '@/lib/supabase/admin';
import { monthKey } from '@/lib/time';

/**
 * Monthly allowance of AI imports per account (gigs and repertoire share one pool). Only a read that
 * succeeded is counted, and the month rolls over on the 1st at Brasília time (`monthKey`).
 * The limit itself is per account: `subscriptions.import_quota`, defaulting to IMPORT_QUOTA (lib/plans).
 */
export type ImportUsage = { used: number; limit: number };

export async function importsUsed(bandIds: string[]): Promise<Record<string, number>> {
  if (bandIds.length === 0) return {};
  const { data } = await createAdminClient().from('import_usage').select('band_id, count').in('band_id', bandIds).eq('month', monthKey());
  return Object.fromEntries((data ?? []).map((r) => [r.band_id as string, Number(r.count)]));
}

export async function quotaError(bandId: string, limit: number): Promise<string | null> {
  const used = (await importsUsed([bandId]))[bandId] ?? 0;
  return used >= limit ? `Você usou as ${limit} importações deste mês. A cota volta no dia 1.` : null;
}

/** Counts one successful read and returns the usage after it. */
export async function recordImport(bandId: string, limit: number): Promise<ImportUsage> {
  const { data } = await createAdminClient().rpc('bump_import_usage', { p_band: bandId, p_month: monthKey() });
  return { used: Number(data ?? 0), limit };
}
