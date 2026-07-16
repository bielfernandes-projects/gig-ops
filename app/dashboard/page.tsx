import { getUserInfo } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { GigWithProject, GoLineup } from '@/lib/types';
import DashboardClient from '@/components/dashboard-client';

export const revalidate = 0;

export default async function DashboardPage() {
  const { role, memberId: userMemberId, userId, invitedBy } = await getUserInfo();

  // Multi-tenant isolation: scope every read to a single "tenant admin id".
  const tenantAdminId = role === 'admin' ? userId : invitedBy;

  // Build gig query with tenant isolation
  let gigsQuery = supabase
    .from('go_gigs')
    .select(`
      id, project_id, title, start_time, end_time, gross_value, bring_sound, sound_cost, is_sound_paid,
      go_projects ( name, color_hex )
    `)
    .order('start_time', { ascending: true });

  if (tenantAdminId) {
    gigsQuery = gigsQuery.eq('admin_id', tenantAdminId);
  }

  const { data: gigsData } = await gigsQuery as unknown as { data: GigWithProject[] | null };
  const allGigs = gigsData || [];

  // Fetch lineups only for the gigs we already have (tenant-scoped).
  const gigIds = allGigs.map(g => g.id);
  const { data: lineupsData } = gigIds.length > 0
    ? await supabase
        .from('go_lineup')
        .select('*')
        .in('gig_id', gigIds) as unknown as { data: GoLineup[] | null }
    : { data: [] as GoLineup[] };
  const lineups = lineupsData || [];

  return (
    <DashboardClient
      role={role}
      userMemberId={userMemberId}
      gigs={allGigs}
      lineups={lineups}
    />
  );
}
