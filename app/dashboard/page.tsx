import { getUserInfo } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { GigWithProject, GoLineup } from '@/lib/types';
import DashboardClient from '@/components/dashboard-client';

export const revalidate = 0;

export default async function DashboardPage() {
  const { role, memberId: userMemberId } = await getUserInfo();

  // Fetch all gigs and lineups
  const [gigsResult, lineupsResult] = await Promise.all([
    supabase
      .from('go_gigs')
      .select(`
        id, project_id, title, start_time, end_time, gross_value, bring_sound, sound_cost, is_sound_paid,
        go_projects ( name, color_hex )
      `)
      .order('start_time', { ascending: true }) as unknown as Promise<{ data: GigWithProject[] | null }>,
    supabase
      .from('go_lineup')
      .select('*') as unknown as Promise<{ data: GoLineup[] | null }>,
  ]);

  const allGigs = gigsResult.data || [];
  const lineups = lineupsResult.data || [];

  return (
    <DashboardClient 
      role={role}
      userMemberId={userMemberId}
      gigs={allGigs}
      lineups={lineups}
    />
  );
}