import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BAND_COOKIE } from '@/lib/auth';
import { createBandFor } from '@/lib/bands';
import { logAction } from '@/lib/telemetry';
import { PENDING_BAND_COOKIE } from '@/lib/pending-band';

// OAuth (Google) return URL: swaps the code for a session, then sends brand-new
// accounts (no band yet) to /onboarding and everyone else to the dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error('OAuth callback: code exchange failed:', error.code, error.message);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const { count } = user
        ? await supabase.from('band_members').select('band_id', { count: 'exact', head: true }).eq('user_id', user.id)
        : { count: 0 };

      // Quem veio de "Criar minha banda" + Google já digitou o nome da banda em /login: cria a
      // banda aqui e pula o /onboarding. Qualquer falha cai no /onboarding, que pergunta de novo.
      const jar = await cookies();
      const pendingName = decodeURIComponent(jar.get(PENDING_BAND_COOKIE)?.value ?? '').trim();
      if (pendingName) jar.delete(PENDING_BAND_COOKIE);
      if (user && !count && pendingName) {
        const created = await createBandFor(user.id, pendingName.slice(0, 60));
        if (!('error' in created)) {
          await logAction('banda_criada', user.id, created.bandId);
          jar.set(BAND_COOKIE, created.bandId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
          return NextResponse.redirect(`${origin}/dashboard`);
        }
        console.error('OAuth callback: could not create band from pending name:', created.error);
      }

      return NextResponse.redirect(`${origin}${count ? '/dashboard' : '/onboarding'}`);
    }
    return NextResponse.redirect(`${origin}/login?erro=google&motivo=${encodeURIComponent(error.code ?? '')}`);
  }

  // Google/Supabase can also reject before ever issuing a code (denied consent, a failing
  // `handle_new_user` trigger, ...). `error_code` is the machine-readable one the login page
  // matches on; the description is only useful in the logs.
  const providerError = searchParams.get('error_code') ?? searchParams.get('error');
  if (providerError) {
    console.error('OAuth callback: provider error:', providerError, searchParams.get('error_description'));
  }
  return NextResponse.redirect(`${origin}/login?erro=google${providerError ? `&motivo=${encodeURIComponent(providerError)}` : ''}`);
}
