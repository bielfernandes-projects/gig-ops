import { NextResponse } from 'next/server';
import { getUserInfo, requireOwner } from '@/lib/auth';
import { quotaError, recordImport } from '@/lib/import-quota';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/telemetry';
import { ImportError, parseRepertoire } from '@/lib/repertoire-import';

// Reading a 200-song document takes up to a minute or so on the free Gemini tier.
export const maxDuration = 300;

/** The free Gemini quota is shared by every band, so each band gets a daily allowance of successful reads. */
const DAILY_LIMIT = 8;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Reads a repertoire document (PDF, DOCX or TXT) and returns the songs grouped in blocks. Writes
 * nothing to the catalog: the person reviews the result on screen and `saveImportedRepertoire`
 * saves it. Only the band's owner can import, like every other band-wide repertoire change.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const bandId = form?.get('band_id');
  if (!(file instanceof File) || file.size === 0) return fail('Envie um arquivo.', 400);

  const ctx = await requireOwner('repertorio', typeof bandId === 'string' ? bandId : null);
  if (!ctx.ok) return fail(ctx.error, 403);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail('A importação ainda não está disponível neste ambiente.', 503);

  const limit = (await getUserInfo()).bands[ctx.bandId]?.importQuota ?? 0;
  const overQuota = await quotaError(ctx.bandId, limit);
  if (overQuota) return fail(overQuota, 429);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await createAdminClient()
    .from('app_events')
    .select('id', { count: 'exact', head: true })
    .eq('name', 'repertorio_lido')
    .eq('band_id', ctx.bandId)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) return fail(`Limite de ${DAILY_LIMIT} importações por dia atingido. Tente de novo amanhã.`, 429);

  try {
    const result = await parseRepertoire(
      { name: file.name, mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()) },
      { apiKey, model: process.env.GEMINI_MODEL },
    );
    if (result.blocks.length === 0) return fail('Não encontrei músicas nesse documento.', 422);
    await logAction('repertorio_lido', ctx.userId, ctx.bandId);
    return NextResponse.json({ ...result, usage: await recordImport(ctx.bandId, limit) });
  } catch (e) {
    if (e instanceof ImportError) return fail(e.message, 422);
    console.error('repertoire import failed', e);
    return fail('Não foi possível ler o documento.', 500);
  }
}
