'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { addProject } from '@/app/actions/project-actions';

export function AddProjectModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const res = await addProject(formData);
    
    if (res.error) {
      alert(`Erro ao criar projeto: ${res.error}`);
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
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Novo Projeto</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Nome do Formato
                </label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-700"
                  placeholder="Ex: Formato Acústico"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="color_hex" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Cor do Badge
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    id="color_hex" 
                    name="color_hex" 
                    defaultValue="#3b82f6"
                    required 
                    className="w-12 h-10 p-0 border-0 bg-transparent rounded-md cursor-pointer"
                  />
                  <span className="text-sm text-zinc-500">Selecione uma cor para identificar o projeto</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="mt-2 w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98]"
              >
                Salvar Projeto
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
