'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { GoMember } from '@/lib/types';
import { MemberCard } from '@/components/member-card';

interface MembersSearchProps {
  members: GoMember[];
  role: string;
}

export function MembersSearch({ members, role }: MembersSearchProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return members;
    const q = query.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.instrument.toLowerCase().includes(q)
    );
  }, [query, members]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-zinc-500" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou instrumento…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            Nenhum músico encontrado para &ldquo;{query}&rdquo;
          </div>
        ) : (
          filtered.map((member) => (
            <MemberCard key={member.id} member={member} role={role} />
          ))
        )}
      </div>

      {/* Result count */}
      {query && filtered.length > 0 && (
        <p className="text-xs text-zinc-600 text-center">
          {filtered.length} {filtered.length === 1 ? 'músico encontrado' : 'músicos encontrados'}
        </p>
      )}
    </div>
  );
}
