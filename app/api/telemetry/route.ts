import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logEvent, normalizeScreen } from '@/lib/telemetry';

/**
 * Recebe as navegações do `ScreenTracker`. O usuário vem **da sessão**, nunca do corpo da
 * requisição: o corpo é do cliente e daria pra qualquer pessoa gravar evento no nome de outra.
 * Sem sessão não grava nada e responde 204 — a rota nunca é um erro visível pra quem navega.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return new NextResponse(null, { status: 204 });

  let path: unknown;
  try {
    ({ path } = await request.json());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 200) {
    return new NextResponse(null, { status: 204 });
  }

  // Normaliza no servidor: o cliente manda o caminho cru e quem decide o formato é sempre daqui.
  await logEvent({ kind: 'screen', name: normalizeScreen(path), userId: claims.sub as string });

  return new NextResponse(null, { status: 204 });
}
