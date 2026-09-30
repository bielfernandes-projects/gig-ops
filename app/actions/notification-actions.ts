'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserInfo } from '@/lib/auth';
import { isNewUpdate, type AppNotification, type AppUpdate, type UpdateKind } from '@/lib/notification-model';

/**
 * Everything here reads with the service role but always filters by the verified session user:
 * `user_notifications`, `app_updates` and `go_profiles` take no access from the browser (RLS).
 */

type NotificationRow = { id: string; kind: string; title: string; body: string; url: string | null; read_at: string | null; created_at: string };
type UpdateRow = { id: string; kind: UpdateKind; title: string; body: string; published_at: string; created_at: string };

const UPDATE_COLUMNS = 'id, kind, title, body, published_at, created_at';
const toUpdate = (r: UpdateRow, seenAt: string | null): AppUpdate => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, publishedAt: r.published_at, isNew: isNewUpdate(r.created_at, seenAt) });

export type BellData = { notifications: AppNotification[]; unread: number; newUpdates: number };

/** The bell: latest notifications, how many are unread and how many app updates the person has not seen. */
export async function getBellData(): Promise<BellData> {
  const info = await getUserInfo();
  if (!info.userId) return { notifications: [], unread: 0, newUpdates: 0 };
  const admin = createAdminClient();

  const [list, unread, profile, updates] = await Promise.all([
    admin.from('user_notifications').select('id, kind, title, body, url, read_at, created_at').eq('user_id', info.userId).order('created_at', { ascending: false }).limit(30) as unknown as Promise<{ data: NotificationRow[] | null }>,
    admin.from('user_notifications').select('id', { count: 'exact', head: true }).eq('user_id', info.userId).is('read_at', null) as unknown as Promise<{ count: number | null }>,
    admin.from('go_profiles').select('updates_seen_at').eq('id', info.userId).maybeSingle() as unknown as Promise<{ data: { updates_seen_at: string | null } | null }>,
    admin.from('app_updates').select('created_at').order('created_at', { ascending: false }).limit(20) as unknown as Promise<{ data: { created_at: string }[] | null }>,
  ]);

  const seenAt = profile.data?.updates_seen_at ?? null;
  return {
    notifications: (list.data ?? []).map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, url: r.url, readAt: r.read_at, createdAt: r.created_at })),
    unread: unread.count ?? 0,
    newUpdates: (updates.data ?? []).filter((u) => isNewUpdate(u.created_at, seenAt)).length,
  };
}

export async function markNotificationsRead() {
  const info = await getUserInfo();
  if (!info.userId) return;
  await createAdminClient().from('user_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', info.userId).is('read_at', null);
}

/** App updates for the pop-up: only the ones the person has not seen yet, or the latest ones (history). */
export async function getUpdates(mode: 'new' | 'all'): Promise<{ updates: AppUpdate[] }> {
  const info = await getUserInfo();
  if (!info.userId) return { updates: [] };
  const admin = createAdminClient();

  const [rows, profile] = await Promise.all([
    admin.from('app_updates').select(UPDATE_COLUMNS).order('published_at', { ascending: false }).limit(20) as unknown as Promise<{ data: UpdateRow[] | null }>,
    admin.from('go_profiles').select('updates_seen_at').eq('id', info.userId).maybeSingle() as unknown as Promise<{ data: { updates_seen_at: string | null } | null }>,
  ]);

  const seenAt = profile.data?.updates_seen_at ?? null;
  const updates = (rows.data ?? []).map((r) => toUpdate(r, seenAt));
  return { updates: mode === 'new' ? updates.filter((u) => u.isNew) : updates };
}

/** The person closed the pop-up: everything launched so far counts as seen. */
export async function markUpdatesSeen() {
  const info = await getUserInfo();
  if (!info.userId) return;
  await createAdminClient().from('go_profiles').update({ updates_seen_at: new Date().toISOString() }).eq('id', info.userId);
}
