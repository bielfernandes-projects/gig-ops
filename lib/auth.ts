import { createClient } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'viewer';

export type UserInfo = {
  role: UserRole;
  email: string | undefined;
  memberId: string | null;
  userId: string | null;
  invitedBy: string | null;
};

/**
 * Single unified auth call.
 * For admins: memberId = go_members row owned by this admin (matches by email + admin_id).
 * For viewers: memberId = go_members row owned by the admin that invited them
 *              (profile.invited_by, then go_members.email + go_members.admin_id).
 *
 * If `invited_by` is null (unlinked viewer), we fall back to a same-email match
 * across all admin owners, then by the profile's own user.id (last-ditch).
 */
export async function getUserInfo(): Promise<UserInfo> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { role: 'viewer', email: undefined, memberId: null, userId: null, invitedBy: null };

  const email = user.email;

  // 1) Load the profile to know role + invited_by
  const { data: profile } = await supabase
    .from('go_profiles')
    .select('role, invited_by')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole) || 'viewer';
  const invitedBy = profile?.invited_by ?? null;

  if (!email) {
    return { role, email, memberId: null, userId: user.id, invitedBy };
  }

  // 2) Determine the admin_id we should match the member against.
  //    Admins own themselves; viewers belong to whoever invited them.
  const targetAdminId = role === 'admin' ? user.id : invitedBy;

  if (!targetAdminId) {
    return { role, email, memberId: null, userId: user.id, invitedBy };
  }

  // 3) Resolve the member by (email, admin_id)
  const { data: member } = await supabase
    .from('go_members')
    .select('id')
    .eq('email', email)
    .eq('admin_id', targetAdminId)
    .maybeSingle();

  return {
    role,
    email,
    memberId: member?.id ?? null,
    userId: user.id,
    invitedBy,
  };
}

// Backwards-compatible exports
export async function getUserRole(): Promise<UserRole> {
  const { role } = await getUserInfo();
  return role;
}

export async function getUserEmail(): Promise<string | undefined> {
  const { email } = await getUserInfo();
  return email;
}
