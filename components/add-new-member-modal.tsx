'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { addMember } from '@/app/actions/member-actions';

export function AddNewMemberModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const res = await addMember(formData);
    
    if (res.error) {
      alert(`Erro ao salvar músico: ${res.error}`);
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
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Novo Músico</h2>
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
                  Nome do Músico
                </label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-700"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="instrument" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Instrumento Principal
                </label>
                <input 
                  type="text" 
                  id="instrument" 
                  name="instrument" 
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-700"
                  placeholder="Ex: Bateria"
                />
              </div>

               <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  WhatsApp (Opcional)
                </label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-700"
                  placeholder="Ex: 11999999999"
                />
              </div>

              <button 
                type="submit" 
                className="mt-2 w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98]"
              >
                Salvar Músico
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
