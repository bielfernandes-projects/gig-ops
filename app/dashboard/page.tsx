import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { toBandRoles } from '@/lib/band-view';
import { createClient } from '@/lib/supabase/server';
import { GigWithProject, GoLineup } from '@/lib/types';
import DashboardClient from '@/components/dashboard-client';

export const revalidate = 0;

export default async function DashboardPage() {
  const info = await getUserInfo();
  if (info.memberships.length === 0) redirect('/onboarding');
  const supabase = await createClient();

  // Tenant isolation: only the bands in the current view (one band, or all of the person's bands).
  // The tour flag is independent of the gigs, so both go out together.
  const [{ data: gigsData }, { data: profile }] = await Promise.all([
    supabase
      .from('go_gigs')
      .select(`
        id, project_id, title, start_time, end_time, gross_value, bring_sound, sound_cost, is_sound_paid, band_id,
        go_projects ( name, color_hex )
      `)
      .in('band_id', info.bandIds)
      .order('start_time', { ascending: true }) as unknown as Promise<{ data: GigWithProject[] | null }>,
    supabase
      .from('go_profiles')
      .select('tour_seen_at')
      .eq('id', info.userId ?? '')
      .maybeSingle() as unknown as Promise<{ data: { tour_seen_at: string | null } | null }>,
  ]);
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
      role={info.role}
      userId={info.userId ?? ''}
      tourSeen={Boolean(profile?.tour_seen_at)}
      bandRoles={toBandRoles(info.bands)}
      allBands={info.allBands}
      gigs={allGigs}
      lineups={lineups}
      subscription={info.subscription}
    />
  );
}
