import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/telemetry';
import { parseGigs } from '@/lib/gig-import';
import { ImportError } from '@/lib/gemini';

export const maxDuration = 300;

/** Same free Gemini quota as the repertoire import, so the same daily allowance per band. */
const DAILY_LIMIT = 60; // TEMPORARIO: voltar para 8
const MAX_TEXT = 60_000;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Reads a gig list (file or pasted text) and returns the gigs it found. Writes nothing: the person reviews
 * the result on screen and `saveImportedGigs` saves it. Only the band's owner can import.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const pasted = form?.get('text');
  const bandId = form?.get('band_id');
  const hasFile = file instanceof File && file.size > 0;
  const text = typeof pasted === 'string' ? pasted.trim() : '';
  if (!hasFile && !text) return fail('Envie um arquivo ou cole o texto da lista.', 400);
  if (text.length > MAX_TEXT) return fail('O texto é grande demais. Divida a lista em partes.', 413);

  const ctx = await requireOwner(undefined, typeof bandId === 'string' ? bandId : null);
  if (!ctx.ok) return fail(ctx.error, 403);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail('A importação ainda não está disponível neste ambiente.', 503);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await createAdminClient()
    .from('app_events')
    .select('id', { count: 'exact', head: true })
    .eq('name', 'gigs_lidas')
    .eq('band_id', ctx.bandId)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) return fail(`Limite de ${DAILY_LIMIT} importações por dia atingido. Tente de novo amanhã.`, 429);

  try {
    const input = hasFile ? { file: { name: file.name, mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()) } } : { text };
    const result = await parseGigs(input, { apiKey, model: process.env.GEMINI_MODEL });
    if (result.gigs.length === 0) return fail('Não encontrei gigs nessa lista.', 422);
    await logAction('gigs_lidas', ctx.userId, ctx.bandId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ImportError) return fail(e.message, 422);
    console.error('gig import failed', e);
    return fail('Não foi possível ler a lista.', 500);
  }
}
