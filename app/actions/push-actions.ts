'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';


async function sessionUserId() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return user?.id ?? null;
}

/** Save a push subscription to the DB, linked to a user profile id */
export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
  if (!userId || userId !== (await sessionUserId())) return { error: 'Não autorizado.' };
  const subscriptionJson = JSON.stringify(subscription);

  // Upsert by endpoint to avoid duplicates
  const { error } = await createAdminClient()
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

/** Remove a push subscription from the DB by endpoint. The user-side
 *  pushManager.unsubscribe() should be called by the client too. */
export async function removePushSubscription(userId: string, endpoint: string) {
  if (!userId || !endpoint || userId !== (await sessionUserId())) {
    return { error: 'Não autorizado.' };
  }

  const { error } = await createAdminClient()
    .from('go_push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('Error removing push subscription:', error);
    return { error: error.message };
  }
  return { success: true };
}

