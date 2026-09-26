import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { ADMIN_COOKIE, isSuperAdmin, verifyElevation } from '@/lib/admin';

/** A senha desta sessão já foi conferida e ainda vale? */
export async function isElevated(userId: string | null): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyElevation(token, userId);
}

/**
 * Gate de cada página do painel (não do layout: a tela de senha vive sob o mesmo layout e ficaria em
 * loop). Devolve o e-mail do admin já elevado; quem não passou pela senha vai pra `/admin/entrar`.
 */
export async function requireElevatedAdmin(): Promise<{ email: string; userId: string }> {
  const info = await getUserInfo();
  if (!info.userId || !isSuperAdmin(info.email)) redirect('/admin/entrar');
  if (!(await isElevated(info.userId))) redirect('/admin/entrar');
  return { email: info.email!, userId: info.userId };
}
