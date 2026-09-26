'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { deleteUser, previewUserDeletion, sendPasswordReset, type DeletionImpact } from '@/app/admin/actions';

/**
 * Ações por conta. Apagar é irreversível, então nunca acontece num clique: primeiro busca no servidor
 * o que exatamente será destruído (`previewUserDeletion`) e mostra isso; só depois libera o botão.
 */
export function AdminUserActions({ userId, email }: { userId: string; email: string }) {
  const [pending, startTransition] = useTransition();
  const [impact, setImpact] = useState<DeletionImpact | null>(null);

  const reset = () =>
    startTransition(async () => {
      const res = await sendPasswordReset(email);
      if (res?.error) toast.error(res.error);
      else toast.success(`E-mail de redefinição enviado para ${email}.`);
    });

  const askToDelete = () =>
    startTransition(async () => {
      const res = await previewUserDeletion(userId);
      if ('error' in res) toast.error(res.error);
      else setImpact(res);
    });

  const confirmDelete = () =>
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success('Conta apagada.');
        setImpact(null);
      }
    });

  if (impact) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-left">
        <p className="text-xs font-bold text-red-300">Apagar {impact.email}?</p>

        {impact.bandsDestroyed.length > 0 ? (
          <div className="text-[11px] leading-relaxed text-zinc-300">
            <p className="mb-1">Estas bandas serão destruídas junto, com tudo dentro:</p>
            <ul className="flex flex-col gap-0.5">
              {impact.bandsDestroyed.map((b) => (
                <li key={b.id}>
                  <strong className="text-zinc-100">{b.name}</strong> — {b.gigs} shows, {b.members} músicos, {b.songs} músicas
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[11px] text-zinc-300">Nenhuma banda será destruída (não é dona única de nenhuma).</p>
        )}

        {impact.bandsKept.length > 0 && (
          <p className="text-[11px] text-zinc-400">
            Continuam de pé (têm outro dono): {impact.bandsKept.join(', ')}
          </p>
        )}

        <p className="text-[11px] font-semibold text-red-400">Não tem como desfazer.</p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={confirmDelete}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {pending ? 'Apagando...' : 'Apagar mesmo assim'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setImpact(null)}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={reset}
        className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
      >
        Redefinir senha
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={askToDelete}
        className="rounded-md border border-red-500/40 px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
      >
        Apagar
      </button>
    </div>
  );
}
