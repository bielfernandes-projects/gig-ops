import { getUserInfo } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import ProfileClient from '@/components/profile-client';
import { GoProfile, GoSettings } from '@/lib/types';

export const revalidate = 0;

export default async function ProfilePage() {
  const { role, email, userId } = await getUserInfo();

  let settingsQuery = Promise.resolve({ data: null as GoSettings | null });
  let profilesQuery = Promise.resolve({ data: null as GoProfile[] | null });
  let viewerProfileQuery = Promise.resolve({ data: null as { invited_by: string | null } | null });

  if (role === 'admin' && userId) {
    settingsQuery = supabase
      .from('go_settings')
      .select('invite_code')
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

  const [settingsResult, profilesResult, viewerProfileResult] = await Promise.all([
    settingsQuery,
    profilesQuery,
    viewerProfileQuery,
  ]);

  const inviteCode = settingsResult.data?.invite_code || null;
  const profiles = profilesResult.data || [];

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
      viewerInviteCode={viewerInviteCode}
    />
  );
}
