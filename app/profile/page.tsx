import { getUserInfo } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import ProfileClient from '@/components/profile-client';
import { GigWithProject, GoLineup, GoProfile, GoSettings } from '@/lib/types';

export const revalidate = 0;

export default async function ProfilePage() {
  // Single auth call (replaces getUserRole + getUserEmail + go_members lookup)
  const { role, email, memberId: userMemberId, userId } = await getUserInfo();

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

  // Build admin-scoped gigs query
  let gigsQuery = supabase
    .from('go_gigs')
    .select(`
      id, project_id, start_time, gross_value, bring_sound, sound_cost,
      go_projects ( name, color_hex )
    `);

  if (role === 'admin' && userId) {
    gigsQuery = gigsQuery.eq('admin_id', userId);
  }

  // Build admin-scoped settings query + viewer profile query
  let settingsQuery = Promise.resolve({ data: null as GoSettings | null });
  let profilesQuery = Promise.resolve({ data: null as GoProfile[] | null });
  let viewerProfileQuery = Promise.resolve({ data: null as { invited_by: string | null } | null });

  if (role === 'admin' && userId) {
    settingsQuery = supabase
      .from('go_settings')
      .select('invite_code, calendar_token')
      .eq('admin_id', userId)
      .maybeSingle() as unknown as Promise<{ data: GoSettings | null }>;

    profilesQuery = supabase
      .from('go_profiles')
      .select('*')
      .eq('invited_by', userId)
      .order('email', { ascending: true }) as unknown as Promise<{ data: GoProfile[] | null }>;
  } else if (role !== 'admin' && userId) {
    viewerProfileQuery = supabase
      .from('go_profiles')
      .select('invited_by')
      .eq('id', userId)
      .maybeSingle() as unknown as Promise<{ data: { invited_by: string | null } | null }>;
  }

  // Parallel data fetching — all independent queries run simultaneously
  const [settingsResult, profilesResult, gigsResult, lineupsResult, viewerProfileResult] = await Promise.all([
    settingsQuery,
    profilesQuery,
    gigsQuery as unknown as Promise<{ data: GigWithProject[] | null }>,
    supabase
      .from('go_lineup')
      .select('*') as unknown as Promise<{ data: GoLineup[] | null }>,
    viewerProfileQuery,
  ]);

  const inviteCode = settingsResult.data?.invite_code || null;
  const adminCalendarToken = settingsResult.data?.calendar_token || null;
  const profiles = profilesResult.data || [];
  const gigs = gigsResult.data || [];
  const lineups = lineupsResult.data || [];

  // For viewers: fetch the admin's invite code to display
  let viewerInviteCode: string | null = null;
  const viewerInvitedBy = viewerProfileResult.data?.invited_by || null;
  if (role !== 'admin' && viewerInvitedBy) {
    const { data: adminSettings } = await supabase
      .from('go_settings')
      .select('invite_code')
      .eq('admin_id', viewerInvitedBy)
      .maybeSingle();
    viewerInviteCode = adminSettings?.invite_code || null;
  }

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
      userId={userId}
      viewerInviteCode={viewerInviteCode}
    />
  );
}
