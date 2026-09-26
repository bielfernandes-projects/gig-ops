'use client';

import { useState } from 'react';
import { elevate } from '@/app/admin/entrar/actions';

export function AdminPasswordForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        // Em caso de sucesso a action redireciona, então só o erro volta pra cá.
        const res = await elevate(new FormData(e.currentTarget));
        if (res?.error) {
          setError(res.error);
          setLoading(false);
        }
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="password"
        name="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Sua senha"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
      />
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-center text-[11px] font-semibold text-red-500">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition-transform hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Conferindo...' : 'Entrar no painel'}
      </button>
    </form>
  );
}
