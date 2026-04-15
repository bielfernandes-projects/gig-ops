'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { addQuickGig } from '@/app/actions/gig-actions';
import { GoProject } from '@/lib/types';

export function QuickAddGig({ projects }: { projects: GoProject[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Server Action executed BEFORE closing to handle errors gracefully
    const res = await addQuickGig(formData);
    
    if (res.error) {
      alert(`Erro ao salvar: ${res.error}`);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[88px] md:bottom-10 right-4 md:right-10 z-40 flex items-center justify-center w-14 h-14 bg-zinc-100 text-zinc-900 rounded-full hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
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
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Novo Show</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Título
                </label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-700"
                  placeholder="Ex: Show Sesc Paulista"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="project_id" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Série / Formato
                </label>
                <select 
                  id="project_id" 
                  name="project_id" 
                  required
                  defaultValue=""
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all appearance-none"
                >
                  <option value="" disabled>Selecione o Projeto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="date" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Data e Hora
                </label>
                <input 
                  type="datetime-local" 
                  id="date" 
                  name="date" 
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all color-scheme-dark"
                  style={{ colorScheme: 'dark' }} // Native datetime browser fix for dark mode text readability
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gross_value" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Valor Bruto (R$)
                </label>
                <input 
                  type="number" 
                  id="gross_value" 
                  name="gross_value" 
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
                Salvar Gig
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
