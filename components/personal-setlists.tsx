'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Lock } from 'lucide-react';
import { createPersonalSetlist } from '@/app/actions/setlist-actions';
import { BandTag } from '@/components/band-tag';
import type { BandChoice } from '@/components/band-select-field';

/** "Meus repertórios": setlists only the creator sees (e.g. blocks a member can sing when asked). */
export function PersonalSetlists({ lists, bands }: { lists: { id: string; name: string; bandName?: string }[]; bands: BandChoice[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  // A personal setlist still hangs off a band (it can use that band's catalog).
  const [bandId, setBandId] = useState(bands[0]?.bandId ?? '');
  const [pending, setPending] = useState(false);

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-200">Meus repertórios</h2>
        <span className="text-xs text-zinc-500">só você vê</span>
      </div>

      <form
        className="mb-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await createPersonalSetlist(name, bandId);
          setPending(false);
          if (res?.error) return toast.error(res.error);
          setName('');
          if (res.id) router.push(`/repertorio/lista/${res.id}`);
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Novo repertório (ex: Meu bloco de pagode)"
          aria-label="Nome do novo repertório pessoal"
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

      {lists.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 p-5 text-center text-sm text-zinc-500">
          Você ainda não tem repertórios pessoais. Use para anotar blocos que você sabe cantar ou tocar.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`/repertorio/lista/${l.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800/40">
                <span className="min-w-0 truncate">{l.name}</span>
                <BandTag name={l.bandName} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
