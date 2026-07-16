'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Loader2, Search, UserPlus } from 'lucide-react';
import { addMemberToLineup } from '@/app/actions/gig-actions';
import { GoMember } from '@/lib/types';
import { toast } from 'sonner';

type SelectedMember = { type: 'member'; member: GoMember } | { type: 'custom' } | null;

export function AddLineupMember({ gigId, members }: { gigId: string, members: GoMember[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SelectedMember>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.instrument.toLowerCase().includes(search.toLowerCase())
  );

  const reset = () => {
    setSearch('');
    setSelected(null);
  };

  const handleSelectMember = (member: GoMember) => {
    setSelected({ type: 'member', member });
    setSearch(member.name);
  };

  const handleSelectCustom = () => {
    setSelected({ type: 'custom' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    formData.append('gig_id', gigId);

    const res = await addMemberToLineup(formData);

    if (res.error) {
      toast.error(`Erro ao adicionar membro: ${res.error}`);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      reset();
      toast.success('Músico escalado com sucesso!');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-transparent border-2 border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-xl p-5 transition-all group focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900 select-none"
      >
        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="font-semibold text-sm tracking-wide">Adicionar Músico à Escala</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isPending && setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Escalar Músico</h2>
              <button
                onClick={() => { if (!isPending) { setIsOpen(false); reset(); } }}
                disabled={isPending}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Search input */}
              <div className="flex flex-col gap-1.5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-zinc-500" />
                  </div>
                  <input
                    ref={searchRef}
                    id="member-search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (selected) setSelected(null);
                    }}
                    placeholder="Buscar por nome ou instrumento..."
                    autoComplete="off"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Members list */}
              {members.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-4 text-center">
                  <p className="text-sm text-zinc-500">Nenhum músico cadastrado.</p>
                  <p className="text-xs font-medium text-zinc-500">Cadastre membros no menu Equipe primeiro.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto -mx-1 px-1">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMember(m)}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selected?.type === 'member' && selected.member.id === m.id
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold truncate">{m.name}</span>
                        <span className="text-xs font-medium text-zinc-500">{m.instrument}</span>
                      </div>
                      {selected?.type === 'member' && selected.member.id === m.id && (
                        <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}

                  {filteredMembers.length === 0 && search.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectCustom}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selected?.type === 'custom'
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold truncate">{`Adicionar "${search.trim()}"`}</span>
                        <span className="text-xs font-medium text-zinc-500">Membro avulso</span>
                      </div>
                      {selected?.type === 'custom' && (
                        <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  )}

                  {filteredMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectCustom}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selected?.type === 'custom'
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold">+ Membro avulso</span>
                        <span className="text-xs font-medium text-zinc-600">Não está na equipe</span>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Hidden fields */}
              <input type="hidden" name="musician_id" value={selected?.type === 'member' ? selected.member.id : ''} />
              <input type="hidden" name="musician_name" value={selected?.type === 'custom' ? search.trim() : ''} />

              {/* Custom instrument field */}
              {selected?.type === 'custom' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label htmlFor="custom_instrument" className="text-xs font-medium text-emerald-400">
                    Instrumento / Função
                  </label>
                  <input
                    type="text"
                    id="custom_instrument"
                    name="custom_instrument"
                    placeholder="Ex: Baixo, Fotografia, etc..."
                    required
                    className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-emerald-500/30"
                  />
                  <p className="text-xs font-medium text-zinc-500">Membro avulso. Será adicionado apenas a este show.</p>
                </div>
              )}

              {/* Fee field */}
              {selected && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label htmlFor="agreed_fee" className="text-xs font-medium text-zinc-400">
                    Cachê Base Acordado
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-zinc-500 text-sm font-semibold">R$</span>
                    </div>
                    <input
                      type="number"
                      id="agreed_fee"
                      name="agreed_fee"
                      placeholder="0.00"
                      step="0.01"
                      inputMode="decimal"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || !selected}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed select-none"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Adicionar à Escala'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
