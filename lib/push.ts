import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

webpush.setVapidDetails(
  process.env.VAPID_ADMIN_EMAIL || 'mailto:contato@gigueiros.com.br',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

/** Send a push notification to all subscriptions belonging to a member (by their member_id in go_members) */
export async function sendPushToMember(memberId: string, payload: { title: string; body: string; url?: string }) {
  const enrichedPayload = {
    ...payload,
    icon: '/icon-192x192.png',
    badge: '/badge-icon.png',
  };

  try {
    // 1. Get member email from go_members
    const { data: member } = await createAdminClient()
      .from('go_members')
      .select('email')
      .eq('id', memberId)
      .single();

    if (!member?.email) return; // Member has no email, skip silently

    // 2. Find the profile id matching that email
    const { data: profile } = await createAdminClient()
      .from('go_profiles')
      .select('id')
      .eq('email', member.email)
      .single();

    if (!profile?.id) return; // No registered account for this member

    // 3. Fetch all push subscriptions for that profile
    const { data: subscriptions } = await createAdminClient()
      .from('go_push_subscriptions')
      .select('subscription_json')
      .eq('user_id', profile.id);

    if (!subscriptions || subscriptions.length === 0) return;

    // 4. Send notification to each subscription (fire & forget, don't break main flow)
    const payloadStr = JSON.stringify(enrichedPayload);
    await Promise.allSettled(
      subscriptions.map(async (row) => {
        try {
          const sub = JSON.parse(row.subscription_json) as webpush.PushSubscription;
          await webpush.sendNotification(sub, payloadStr);
        } catch (err) {
          // Remove expired/invalid subscriptions automatically
          console.warn('Push subscription expired, removing:', err);
          await createAdminClient()
            .from('go_push_subscriptions')
            .delete()
            .eq('subscription_json', row.subscription_json);
        }
      })
    );
  } catch (err) {
    // Never throw — push must not block the main gig insert
    console.error('Error in sendPushToMember:', err);
  }
}
/** Send a push notification to every owner of a band */
export async function sendPushToBandOwners(bandId: string, payload: { title: string; body: string; url?: string }) {
  const enrichedPayload = {
    ...payload,
    icon: '/icon-192x192.png',
    badge: '/badge-icon.png',
  };

  try {
    // 1. Only the owners of this band
    const { data: owners } = await createAdminClient()
      .from('band_members')
      .select('user_id')
      .eq('band_id', bandId)
      .eq('role', 'owner');

    if (!owners || owners.length === 0) return;

    // 2. For each owner, fetch their subscriptions and send in parallel
    const payloadStr = JSON.stringify(enrichedPayload);

    await Promise.allSettled(
      owners.map(async (owner) => {
        const { data: subscriptions } = await createAdminClient()
          .from('go_push_subscriptions')
          .select('subscription_json')
          .eq('user_id', owner.user_id);

        if (!subscriptions || subscriptions.length === 0) return;

        await Promise.allSettled(
          subscriptions.map(async (row) => {
            try {
              const sub = JSON.parse(row.subscription_json) as webpush.PushSubscription;
              await webpush.sendNotification(sub, payloadStr);
            } catch (err) {
              console.warn('Owner push subscription expired, removing:', err);
              await createAdminClient()
                .from('go_push_subscriptions')
                .delete()
                .eq('subscription_json', row.subscription_json);
            }
          })
        );
      })
    );
  } catch (err) {
    // Never throw — push must not block the signup flow
    console.error('Error in sendPushToBandOwners:', err);
  }
}
