import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSuperAdmin } from '@/lib/admin'

export async function updateSession(request: NextRequest) {
  // OAuth return that landed on the wrong page: Supabase only honours `redirect_to` when it
  // matches the project's Redirect URL allow list (and there `*` does NOT cross `/`, so
  // `https://host/*` never matches `/auth/callback`). When it doesn't match, GoTrue silently
  // falls back to the Site URL and drops the person on the landing page carrying `?code=`
  // (or `?error=`) that nothing reads: no session, no error, no sign-up finished.
  // Forward those to the real callback so the flow still completes.
  if (
    request.nextUrl.pathname === '/' &&
    (request.nextUrl.searchParams.has('code') || request.nextUrl.searchParams.has('error'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims validates the JWT locally when the project uses asymmetric keys
  // (no round trip to Supabase Auth on every request); falls back to the server otherwise.
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims ?? null

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith('/login') || path === '/auth/reset-password'
  const isPublic =
    path === '/' ||
    path === '/termos' ||
    path === '/privacidade' ||
    path.startsWith('/s/') || // public read-only setlist link (token)
    path === '/auth/callback' || // OAuth return; the session does not exist yet
    path.startsWith('/api/calendar/') || // token-protected iCal feed
    path.startsWith('/api/cron/') || // protected by CRON_SECRET
    path === '/api/stripe/webhook' // protected by the Stripe signature

  if (!user && !isAuthRoute && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Painel de produto: barra cedo quem não é dono do produto. O e-mail já está nas claims, então
  // não custa query nenhuma. A defesa que importa está no layout e em cada action de /admin —
  // esta é só pra a rota nem responder pra quem não tem nada a ver com ela.
  if (path.startsWith('/admin') && !isSuperAdmin(user?.email as string | undefined)) {
    return new NextResponse(null, { status: 404 })
  }

  if (user && (isAuthRoute || path === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
