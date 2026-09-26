import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { isSuperAdmin, ELEVATION_MINUTES } from '@/lib/admin';
import { isElevated } from '@/lib/admin-session';
import { AdminPasswordForm } from '@/components/admin-password-form';

/** Step-up: estar logado no app não abre o painel, a senha é pedida de novo aqui. */
export default async function AdminEntrarPage() {
  const info = await getUserInfo();
  if (!isSuperAdmin(info.email)) redirect('/admin');
  if (await isElevated(info.userId)) redirect('/admin');

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-lg font-bold text-zinc-100">Confirme sua senha</h2>
      <p className="mt-1 mb-5 text-xs leading-relaxed text-zinc-400">
        O painel apaga contas e bandas, então a senha é pedida de novo mesmo com você já logado.
        O acesso vale {ELEVATION_MINUTES} minutos e cai quando você fecha o navegador.
      </p>
      <p className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
        {info.email}
      </p>
      <AdminPasswordForm />
    </div>
  );
}
