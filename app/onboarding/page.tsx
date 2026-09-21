'use client';

import { useState } from 'react';
import { createBand, joinBand } from './actions';

export default function OnboardingPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading('create');
    const res = await createBand(new FormData(e.currentTarget));
    if (res?.error) {
      setError(res.error);
      setLoading(null);
    }
  };

  const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading('join');
    const res = await joinBand(new FormData(e.currentTarget));
    if (res?.error) {
      setError(res.error);
      setLoading(null);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50';

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao Gigueiros</h1>
          <p className="mt-1 text-sm text-zinc-400">Como você vai usar o app?</p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-center text-[11px] font-semibold text-red-500">
            {error}
          </div>
        )}

        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-bold">Sou o responsável pela banda</h2>
          <p className="text-xs text-zinc-400">Crie sua banda e gerencie shows, escala e cachês.</p>
          <form onSubmit={handleCreate} className="mt-2 flex flex-col gap-2">
            <input name="bandName" required maxLength={60} autoComplete="off" placeholder="Nome da banda" className={inputCls} />
            <button
              type="submit"
              disabled={loading !== null}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white transition-transform hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
            >
              {loading === 'create' ? 'Criando...' : 'Criar minha banda'}
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-bold">Fui convidado por uma banda</h2>
          <p className="text-xs text-zinc-400">Digite o código de convite que o responsável te enviou.</p>
          <form onSubmit={handleJoin} className="mt-2 flex flex-col gap-2">
            <input name="inviteCode" required autoComplete="off" placeholder="Ex: BANDA" className={`${inputCls} uppercase`} />
            <button
              type="submit"
              disabled={loading !== null}
              className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-bold text-zinc-900 transition-transform hover:bg-white active:scale-[0.98] disabled:opacity-50"
            >
              {loading === 'join' ? 'Entrando...' : 'Entrar na banda'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
