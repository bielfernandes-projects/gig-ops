import { createClient } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'viewer';

export async function getUserRole(): Promise<UserRole> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 'viewer'; // Failsafe fallback

  const { data: profile } = await supabase
    .from('go_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return (profile?.role as UserRole) || 'viewer';
}

export async function getUserEmail(): Promise<string | undefined> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email;
}
