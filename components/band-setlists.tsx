'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Star } from 'lucide-react';
import { createBandSetlist, setDefaultSetlist } from '@/app/actions/setlist-actions';
import { BandTag } from '@/components/band-tag';
import type { BandChoice } from '@/components/band-select-field';

/** "Repertórios da banda": reutilizáveis entre shows, um deles pode ser o principal. `bands` = bandas em que o usuário é dono (só elas criam/definem o principal). */
export function BandSetlists({ lists, bands }: { lists: { id: string; name: string; isDefault: boolean; bandId: string; bandName?: string }[]; bands: BandChoice[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bandId, setBandId] = useState(bands[0]?.bandId ?? '');
  const [pending, setPending] = useState(false);
  const ownedIds = new Set(bands.map((b) => b.bandId));

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-zinc-200">Repertórios da banda</h2>
        <span className="text-xs text-zinc-500">reutilizáveis em qualquer show</span>
      </div>

      {bands.length > 0 && (
      <form
        className="mb-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await createBandSetlist(name, bandId);
          setPending(false);
          if (res?.error) return toast.error(res.error);
          setName('');
          if (res.id) router.push(`/repertorio/lista/${res.id}`);
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Novo repertório (ex: Repertório padrão)"
          aria-label="Nome do novo repertório da banda"
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        {bands.length > 1 && (
          <select
            value={bandId}
            onChange={(e) => setBandId(e.target.value)}
            aria-label="Banda do repertório"
            className="max-w-[40%] rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none"
          >
            {bands.map((b) => (
              <option key={b.bandId} value={b.bandId}>{b.name}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Criar
        </button>
      </form>
      )}

      {lists.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 p-5 text-center text-sm text-zinc-500">
          {bands.length > 0 ? 'Nenhum repertório da banda ainda. Crie um e marque como principal pra ele já vir selecionado em shows novos.' : 'Nenhum repertório da banda ainda.'}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
          {lists.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <Link href={`/repertorio/lista/${l.id}`} className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-zinc-100 hover:underline">
                <span className="min-w-0 truncate">{l.name}</span>
                <BandTag name={l.bandName} />
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {l.isDefault ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-current" /> Principal
                  </span>
                ) : ownedIds.has(l.bandId) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await setDefaultSetlist(l.id);
                      if (res?.error) toast.error(res.error);
                      else { toast.success('Repertório principal atualizado.'); router.refresh(); }
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:border-amber-400/40 hover:text-amber-300"
                  >
                    <Star className="h-3.5 w-3.5" /> Tornar principal
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
