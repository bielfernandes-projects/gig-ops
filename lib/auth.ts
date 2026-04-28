import { createClient } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'viewer';

export type UserInfo = {
  role: UserRole;
  email: string | undefined;
  memberId: string | null;
  userId: string | null; // NOVO: ID do usuário no Supabase Auth (para multi-tenancy)
};

/**
 * Single unified auth call — replaces the old getUserRole() + getUserEmail() + go_members lookup.
 * Reduces 3+ sequential network calls down to 1 auth call + 1 parallel batch.
 */
export async function getUserInfo(): Promise<UserInfo> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { role: 'viewer', email: undefined, memberId: null, userId: null };

  const email = user.email;

  // Run profile + member lookup in parallel (they are independent)
  const [profileResult, memberResult] = await Promise.all([
    supabase
      .from('go_profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
    email
      ? supabase
          .from('go_members')
          .select('id')
          .eq('email', email)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const role = (profileResult.data?.role as UserRole) || 'viewer';
  const memberId = memberResult.data?.id || null;

  return { role, email, memberId, userId: user.id };
}

// Keep backwards-compatible exports for any code that still imports them individually
export async function getUserRole(): Promise<UserRole> {
  const { role } = await getUserInfo();
  return role;
}

export async function getUserEmail(): Promise<string | undefined> {
  const { email } = await getUserInfo();
  return email;
}
