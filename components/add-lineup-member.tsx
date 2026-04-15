'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { addMemberToLineup } from '@/app/actions/gig-actions';
import { GoMember } from '@/lib/types';

export function AddLineupMember({ gigId, members }: { gigId: string, members: GoMember[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('gig_id', gigId);
    
    const res = await addMemberToLineup(formData);

    if (res.error) {
      alert(`Erro ao adicionar membro: ${res.error}`);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-transparent border-2 border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-xl p-5 transition-all group outline-none"
      >
        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="font-semibold text-sm tracking-wide">Adicionar Músico à Escala</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Escalar Músico</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
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
                  defaultValue=""
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all appearance-none"
                >
                  <option value="" disabled>Selecione um Profissional</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.instrument})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="agreed_fee" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Cachê Base Acordado (R$)
                </label>
                <input 
                  type="number" 
                  id="agreed_fee" 
                  name="agreed_fee" 
                  defaultValue={0} 
                  step="0.01"
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                />
              </div>

              <button 
                type="submit" 
                className="mt-2 w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98]"
              >
                Adicionar à Escala
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
