'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { setPresence } from '@/app/actions/presence-actions';

type Status = 'pending' | 'confirmed' | 'declined';

const LABEL: Record<Status, string> = {
  pending: 'Aguardando sua resposta',
  confirmed: 'Presença confirmada',
  declined: 'Você avisou que não pode',
};

/** Shown to the musician on their own gig: confirm or say they cannot play. */
export function PresenceControl({ lineupId, status }: { lineupId: string; status: Status }) {
  const [pending, startTransition] = useTransition();

  const answer = (next: Status) =>
    startTransition(async () => {
      const res = await setPresence(lineupId, next);
      if (res?.error) toast.error(res.error);
      else toast.success(next === 'confirmed' ? 'Presença confirmada.' : 'Resposta enviada ao responsável.');
    });

  return (
    <section className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-200">Sua presença neste show</p>
        <p className={`text-xs ${status === 'declined' ? 'text-red-400' : status === 'confirmed' ? 'text-zinc-300' : 'text-amber-300'}`}>
          {LABEL[status]}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || status === 'confirmed'}
          onClick={() => answer('confirmed')}
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 transition-colors hover:bg-white disabled:opacity-40"
        >
          Confirmar
        </button>
        <button
          type="button"
          disabled={pending || status === 'declined'}
          onClick={() => answer('declined')}
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-40"
        >
          Não posso
        </button>
      </div>
    </section>
  );
}
