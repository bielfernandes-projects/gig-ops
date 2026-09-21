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
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from('go_profiles').select('role, invited_by').eq('id', user.id).maybeSingle()
        : { data: null };
      const needsOnboarding = profile?.role !== 'admin' && !profile?.invited_by;
      return NextResponse.redirect(`${origin}${needsOnboarding ? '/onboarding' : '/dashboard'}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=google`);
}
