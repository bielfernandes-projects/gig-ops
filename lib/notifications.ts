import { createAdminClient } from '@/lib/supabase/admin';
import type { NotificationKind } from '@/lib/notification-model';

/**
 * Keeps an in-app copy of a notification for each person, so the bell can list it even when the push
 * was never subscribed or was missed. Never throws: losing a notification must not break the action
 * that caused it. Service role, because `user_notifications` takes no access from the browser (RLS).
 */
export async function recordNotification(userIds: string[], n: { kind: NotificationKind; title: string; body: string; url?: string }) {
  if (userIds.length === 0) return;
  try {
    const { error } = await createAdminClient()
      .from('user_notifications')
      .insert(userIds.map((user_id) => ({ user_id, kind: n.kind, title: n.title, body: n.body, url: n.url ?? null })));
    if (error) console.error('recordNotification failed:', error.message);
  } catch (e) {
    console.error('recordNotification failed:', e);
  }
}
