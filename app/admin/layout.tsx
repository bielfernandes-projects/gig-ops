import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getUserInfo } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/admin';
import { isElevated } from '@/lib/admin-session';
import { AdminNav } from '@/components/admin-nav';
import { lockAdmin } from '@/app/admin/entrar/actions';

export const metadata: Metadata = {
  title: 'Admin · Gigueiros',
  robots: { index: false, follow: false },
};

/**
 * Painel de produto. Este é o segundo de três gates: o middleware barra antes quem não está na lista,
 * cada página chama `requireElevatedAdmin()` e cada action em `actions.ts` refaz a checagem — layout
 * não é segurança, server action é endpoint público.
 *
 * `notFound()` em vez de `redirect()`: pra quem não é dono do produto, a rota não existe. A exigência
 * de senha (elevação) NÃO mora aqui de propósito — a tela de senha vive sob este mesmo layout, e
 * exigir elevação no layout faria ela entrar em loop consigo mesma.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const info = await getUserInfo();
  if (!isSuperAdmin(info.email)) notFound();
  const elevated = await isElevated(info.userId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:p-10">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-500">Gigueiros · interno</p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">Painel do produto</h1>
            <p className="mt-1 text-sm text-zinc-400">Contas, assinaturas e uso real do app.</p>
          </div>
          {elevated && (
            <form action={lockAdmin}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Sair do painel
              </button>
            </form>
          )}
        </header>
        {elevated && <AdminNav />}
        {children}
      </div>
    </div>
  );
}
