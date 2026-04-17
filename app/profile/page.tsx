import { getUserInfo } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import ProfileClient from '@/components/profile-client';
import { GigWithProject, GoLineup, GoProfile, GoSettings } from '@/lib/types';

export const revalidate = 0;

export default async function ProfilePage() {
  // Single auth call (replaces getUserRole + getUserEmail + go_members lookup)
  const { role, email, memberId: userMemberId } = await getUserInfo();

  // Fetch member calendar token
  let memberCalendarToken: string | null = null;
  if (userMemberId) {
    const { data: memberData } = await supabase
      .from('go_members')
      .select('calendar_token')
      .eq('id', userMemberId)
      .single();
    memberCalendarToken = memberData?.calendar_token || null;
  }

  // Parallel data fetching — all independent queries run simultaneously
  const [settingsResult, profilesResult, gigsResult, lineupsResult] = await Promise.all([
    role === 'admin'
      ? supabase.from('go_settings').select('invite_code, calendar_token').single() as unknown as Promise<{ data: GoSettings | null }>
      : Promise.resolve({ data: null as GoSettings | null }),
    role === 'admin'
      ? supabase.from('go_profiles').select('*').order('email', { ascending: true }) as unknown as Promise<{ data: GoProfile[] | null }>
      : Promise.resolve({ data: [] as GoProfile[] }),
    supabase
      .from('go_gigs')
      .select(`
        id, project_id, start_time, gross_value, bring_sound, sound_cost,
        go_projects ( name, color_hex )
      `) as unknown as Promise<{ data: GigWithProject[] | null }>,
    supabase
      .from('go_lineup')
      .select('*') as unknown as Promise<{ data: GoLineup[] | null }>,
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
