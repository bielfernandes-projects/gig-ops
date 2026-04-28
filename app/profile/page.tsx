import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ProfileClient from '@/components/profile-client';
import { GigWithProject, GoLineup, GoProfile, GoSettings } from '@/lib/types';

// Cache por 5 minutos (dados financeiros não mudam a cada segundo)
export const revalidate = 300;

export default async function ProfilePage() {
  // Single auth call (replaces getUserRole + getUserEmail + go_members lookup)
  const { role, email, memberId: userMemberId, userId } = await getUserInfo();
  const supabaseServer = await createClient();

  // Fetch member calendar token
  let memberCalendarToken: string | null = null;
  if (userMemberId) {
    const { data: memberData } = await supabaseServer
      .from('go_members')
      .select('calendar_token')
      .eq('id', userMemberId)
      .single();
    memberCalendarToken = memberData?.calendar_token || null;
  }

  // Date range: last 12 months for charts (enough for financial history)
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const startDate = twelveMonthsAgo.toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  // Parallel data fetching — all independent queries run simultaneously
  const [settingsResult, profilesResult, gigsResult, lineupsResult] = await Promise.all([
    role === 'admin'
      ? supabaseServer.from('go_settings').select('invite_code, calendar_token').single() as unknown as Promise<{ data: GoSettings | null }>
      : Promise.resolve({ data: null as GoSettings | null }),
    role === 'admin'
      ? supabaseServer.from('go_profiles').select('*').order('email', { ascending: true }) as unknown as Promise<{ data: GoProfile[] | null }>
      : Promise.resolve({ data: [] as GoProfile[] }),
    (() => {
      let query = supabaseServer
        .from('go_gigs')
        .select(`
          id, project_id, start_time, gross_value, bring_sound, sound_cost, is_sound_paid,
          go_projects ( name, color_hex )
        `)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true });
      
      // NOVO: Filtrar por admin_id se for admin
      if (role === 'admin' && userId) {
        query = query.eq('admin_id', userId);
      }
      
      return query as unknown as Promise<{ data: GigWithProject[] | null }>;
    })(),
    (() => {
      let query = supabaseServer
        .from('go_lineup')
        .select('*')
        .gte('created_at', startDate);
      
      // NOVO: Filtrar lineup por admin_id via join se for admin
      if (role === 'admin' && userId) {
        query = query.eq('go_gigs.admin_id', userId) as any;
      }
      
      return query as unknown as Promise<{ data: GoLineup[] | null }>;
    })(),
  ]);

  const inviteCode = settingsResult.data?.invite_code || null;
  const adminCalendarToken = settingsResult.data?.calendar_token || null;
  const profiles = profilesResult.data || [];
  const gigs = gigsResult.data || [];
  const lineups = lineupsResult.data || [];

  return (
    <ProfileClient 
      role={role}
      email={email ?? null}
      inviteCode={inviteCode}
      profiles={profiles}
      gigs={gigs}
      lineups={lineups}
      userMemberId={userMemberId}
      calendarToken={role === 'admin' ? adminCalendarToken : memberCalendarToken}
    />
  );
}
