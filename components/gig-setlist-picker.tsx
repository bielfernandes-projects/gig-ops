'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ListMusic } from 'lucide-react';
import { attachSetlistToGig, detachSetlistFromGig } from '@/app/actions/setlist-actions';
import type { BandSetlistOption } from '@/components/gig-setlist';

/** Escolha do repertório do show; o repertório em si fica em /repertorio/lista/[id]. */
export function GigSetlistPicker({ gigId, currentId, options, isOwner }: { gigId: string; currentId: string | null; options: BandSetlistOption[]; isOwner: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const current = options.find((s) => s.id === currentId);

  const change = async (id: string) => {
    setPending(true);
    const res = id ? await attachSetlistToGig(gigId, id) : await detachSetlistFromGig(gigId);
    setPending(false);
    if (res?.error) return toast.error(res.error);
    toast.success(id ? 'Repertório do show atualizado.' : 'Repertório removido do show.');
    router.refresh();
  };

  return (
    <section className="mb-10">
      <h2 className="mb-4 px-1 text-sm font-semibold text-zinc-200">Repertório do show</h2>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <ListMusic className="h-5 w-5 shrink-0 text-zinc-500" />
        {isOwner ? (
          <select
            value={currentId ?? ''}
            disabled={pending}
            onChange={(e) => change(e.target.value)}
            aria-label="Repertório usado no show"
            className="min-w-0 flex-1 appearance-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
          >
            <option value="">Qual repertório será usado?</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (principal)' : ''}</option>
            ))}
          </select>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{current?.name ?? 'Repertório ainda não definido'}</span>
        )}
        {current ? (
          <Link href={`/repertorio/lista/${current.id}`} className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white">
            Abrir repertório
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-md bg-zinc-800 px-4 py-2 text-sm font-bold text-zinc-600">Abrir repertório</span>
        )}
      </div>
    </section>
  );
}
