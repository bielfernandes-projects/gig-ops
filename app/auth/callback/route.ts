import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
