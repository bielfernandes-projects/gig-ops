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
      const { count } = user
        ? await supabase.from('band_members').select('band_id', { count: 'exact', head: true }).eq('user_id', user.id)
        : { count: 0 };
      return NextResponse.redirect(`${origin}${count ? '/dashboard' : '/onboarding'}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=google`);
}
