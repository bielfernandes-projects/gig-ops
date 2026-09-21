import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ProfileClient from '@/components/profile-client';
import type { BandMemberView } from '@/components/band-sections';

export const revalidate = 0;

export default async function ProfilePage() {
  const info = await getUserInfo();
  const supabase = await createClient();

  let inviteCode: string | null = null;
  let members: BandMemberView[] = [];

  if (info.bandId) {
    const [bandResult, membersResult] = await Promise.all([
      supabase.from('bands').select('invite_code').eq('id', info.bandId).maybeSingle(),
      info.role === 'admin'
        ? supabase.from('band_members').select('user_id, role').eq('band_id', info.bandId)
        : Promise.resolve({ data: null }),
    ]);

    inviteCode = bandResult.data?.invite_code ?? null;

    const rows = (membersResult.data ?? []) as { user_id: string; role: 'owner' | 'member' }[];
    if (rows.length > 0) {
      const { data: profiles } = await supabase
        .from('go_profiles')
        .select('id, email')
        .in('id', rows.map((r) => r.user_id));
      const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email as string]));

      members = rows
        .map((r) => ({
          userId: r.user_id,
          email: emailById.get(r.user_id) ?? 'sem e-mail',
          role: r.role,
          isSelf: r.user_id === info.userId,
        }))
        .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner') || a.email.localeCompare(b.email));
    }
  }

  return (
    <ProfileClient
      role={info.role}
      email={info.email ?? null}
      bandId={info.bandId}
      bandName={info.bandName}
      memberships={info.memberships}
      inviteCode={inviteCode}
      members={members}
      subscription={info.subscription}
    />
  );
}
