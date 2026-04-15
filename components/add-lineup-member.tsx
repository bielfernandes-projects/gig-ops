'use client';

import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { addMemberToLineup } from '@/app/actions/gig-actions';
import { GoMember } from '@/lib/types';
import { toast } from 'sonner';

export function AddLineupMember({ gigId, members }: { gigId: string, members: GoMember[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

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
      toast.success('Músico escalado com sucesso!');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-transparent border-2 border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-xl p-5 transition-all group outline-none select-none"
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
                onClick={() => !isPending && setIsOpen(false)}
                disabled={isPending}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="musician_id" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Músico / Instrumento
                </label>
                <select 
                  id="musician_id" 
                  name="musician_id" 
                  required
                  autoFocus
                  defaultValue=""
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                >
                  <option value="" disabled>Selecione um Profissional</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.instrument})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="agreed_fee" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
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
                    defaultValue={0} 
                    step="0.01"
                    inputMode="decimal"
                    required 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isPending}
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
