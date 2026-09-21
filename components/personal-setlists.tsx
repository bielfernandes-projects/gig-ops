'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Lock } from 'lucide-react';
import { createPersonalSetlist } from '@/app/actions/setlist-actions';

/** "Meus repertórios": setlists only the creator sees (e.g. blocks a member can sing when asked). */
export function PersonalSetlists({ lists }: { lists: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
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
          const res = await createPersonalSetlist(name);
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
              <Link href={`/repertorio/lista/${l.id}`} className="block px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800/40">
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
