'use server';

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_ADMIN_EMAIL || 'mailto:admin@minhabanda.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

/** Save a push subscription to the DB, linked to a user profile id */
export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
  const subscriptionJson = JSON.stringify(subscription);

  // Upsert by endpoint to avoid duplicates
  const { error } = await supabaseAdmin
    .from('go_push_subscriptions')
    .upsert(
      { user_id: userId, subscription_json: subscriptionJson, endpoint: subscription.endpoint },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('Error saving push subscription:', error);
    return { error: error.message };
  }
  return { success: true };
}

/** Send a push notification to all subscriptions belonging to a member (by their member_id in go_members) */
export async function sendPushToMember(memberId: string, payload: { title: string; body: string; url?: string }) {
  try {
    // 1. Get member email from go_members
    const { data: member } = await supabaseAdmin
      .from('go_members')
      .select('email')
      .eq('id', memberId)
      .single();

    if (!member?.email) return; // Member has no email, skip silently

    // 2. Find the profile id matching that email
    const { data: profile } = await supabaseAdmin
      .from('go_profiles')
      .select('id')
      .eq('email', member.email)
      .single();

    if (!profile?.id) return; // No registered account for this member

    // 3. Fetch all push subscriptions for that profile
    const { data: subscriptions } = await supabaseAdmin
      .from('go_push_subscriptions')
      .select('subscription_json')
      .eq('user_id', profile.id);

    if (!subscriptions || subscriptions.length === 0) return;

    // 4. Send notification to each subscription (fire & forget, don't break main flow)
    const payloadStr = JSON.stringify(payload);
    await Promise.allSettled(
      subscriptions.map(async (row) => {
        try {
          const sub = JSON.parse(row.subscription_json) as webpush.PushSubscription;
          await webpush.sendNotification(sub, payloadStr);
        } catch (err) {
          // Remove expired/invalid subscriptions automatically
          console.warn('Push subscription expired, removing:', err);
          await supabaseAdmin
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
