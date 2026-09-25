import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { monthlyPlan, PRICES } from '@/lib/pricing';
import { countFounders } from '@/lib/founders';
import ProfileClient from '@/components/profile-client';
import type { BandMemberView, BillingView } from '@/components/band-sections';

export const revalidate = 0;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ assinatura?: string }> }) {
  const info = await getUserInfo();
  const supabase = await createClient();
  const { data: me } = info.userId ? await supabase.from('go_profiles').select('display_name').eq('id', info.userId).maybeSingle() : { data: null };

  let inviteCode: string | null = null;
  let members: BandMemberView[] = [];
  let billing: BillingView | null = null;

  if (info.bandId) {
    const isOwner = info.role === 'admin';
    const [bandResult, membersResult, stripeRow, founders] = await Promise.all([
      supabase.from('bands').select('invite_code').eq('id', info.bandId).maybeSingle(),
      isOwner
        ? supabase.from('band_members').select('user_id, role, profit_share').eq('band_id', info.bandId)
        : Promise.resolve({ data: null }),
      isOwner
        ? (createAdminClient().from('subscriptions').select('stripe_customer_id').eq('band_id', info.bandId).maybeSingle() as unknown as Promise<{ data: { stripe_customer_id: string | null } | null }>)
        : Promise.resolve({ data: null }),
      isOwner ? countFounders() : Promise.resolve(0),
    ]);

    inviteCode = bandResult.data?.invite_code ?? null;
    if (isOwner) {
      billing = {
        monthlyPrice: PRICES[monthlyPlan(info.isFounder, founders)],
        hasStripe: Boolean(stripeRow.data?.stripe_customer_id),
        justPaid: (await searchParams).assinatura === 'ok',
      };
    }

    const rows = (membersResult.data ?? []) as { user_id: string; role: 'owner' | 'member'; profit_share: number | null }[];
    if (rows.length > 0) {
      const { data: profiles } = await supabase
        .from('go_profiles')
        .select('id, email, display_name')
        .in('id', rows.map((r) => r.user_id));
      const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email as string]));
      const nameById = new Map((profiles ?? []).map((p) => [p.id, (p.display_name as string | null) ?? null]));

      members = rows
        .map((r) => ({
          userId: r.user_id,
          email: emailById.get(r.user_id) ?? 'sem e-mail',
          label: nameById.get(r.user_id) || emailById.get(r.user_id) || 'sem e-mail',
          role: r.role,
          isSelf: r.user_id === info.userId,
          share: r.profit_share === null ? null : Number(r.profit_share),
        }))
        .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner') || a.label.localeCompare(b.label));
    }
  }

  return (
    <ProfileClient
      role={info.role}
      email={info.email ?? null}
      displayName={(me?.display_name as string | null) ?? null}
      bandId={info.bandId}
      bandName={info.bandName}
      memberships={info.memberships}
      inviteCode={inviteCode}
      members={members}
      subscription={info.subscription}
      pricePlan={info.pricePlan}
      billing={billing}
      founderWhatsappUrl={info.isFounder ? process.env.FOUNDER_WHATSAPP_URL || null : null}
    />
  );
}
