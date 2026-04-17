import { getUserRole, getUserEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import ProfileClient from '@/components/profile-client';
import { GigWithProject, GoLineup, GoProfile, GoSettings } from '@/lib/types';

export const revalidate = 0;

export default async function ProfilePage() {
  const role = await getUserRole();
  const email = await getUserEmail();

  // Fetch user member id for admins and viewers
  let userMemberId: string | null = null;
  let memberCalendarToken: string | null = null;
  if (email) {
    const { data: memberData } = await supabase
      .from('go_members')
      .select('id, calendar_token')
      .eq('email', email)
      .single();
    userMemberId = memberData?.id || null;
    memberCalendarToken = memberData?.calendar_token || null;
  }

  // 1. Fetch settings (invite code)
  let inviteCode = null;
  let adminCalendarToken = null;
  if (role === 'admin') {
    const { data: settingsData } = await supabase
      .from('go_settings')
      .select('invite_code, calendar_token')
      .single() as { data: GoSettings | null };
    inviteCode = settingsData?.invite_code || null;
    adminCalendarToken = settingsData?.calendar_token || null;
  }

  // 2. Fetch profiles if admin
  let profiles: GoProfile[] = [];
  if (role === 'admin') {
    const { data: profilesData } = await supabase
      .from('go_profiles')
      .select('*')
      .order('email', { ascending: true }) as { data: GoProfile[] | null };
    profiles = profilesData || [];
  }

  // 3. Fetch Gigs & Lineups for charts (Section B)
  const { data: gigsData } = await supabase
    .from('go_gigs')
    .select(`
      id, 
      project_id, 
      start_time, 
      gross_value, 
      bring_sound, 
      sound_cost,
      go_projects ( name, color_hex )
    `) as { data: GigWithProject[] | null };

  const { data: lineupsData } = await supabase
    .from('go_lineup')
    .select('*') as { data: GoLineup[] | null };

  const gigs = gigsData || [];
  const lineups = lineupsData || [];

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
