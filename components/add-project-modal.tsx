'use client';

import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { addProject } from '@/app/actions/project-actions';
import { toast } from 'sonner';

export function AddProjectModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [color, setColor] = useState('#3b82f6');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    formData.set('color_hex', color); // Ensure the latest state color is used
    
    const res = await addProject(formData);
    
    if (res.error) {
      toast.error(`Erro ao criar projeto: ${res.error}`);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      setColor('#3b82f6'); // Reset
      toast.success('Projeto criado com sucesso!');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[88px] md:bottom-10 right-4 md:right-10 z-40 flex items-center justify-center w-14 h-14 bg-zinc-100 text-zinc-900 rounded-full hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl select-none"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
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
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Novo Projeto</h2>
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
                <label htmlFor="name" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Nome do Formato
                </label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  autoFocus
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder-zinc-700"
                  placeholder="Ex: Formato Acústico"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="color_hex" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Cor do Badge
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative w-12 h-10 overflow-hidden rounded-md border border-zinc-700 shrink-0">
                    <input 
                      type="color" 
                      id="color_hex_picker" 
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <input 
                    type="text" 
                    id="color_hex" 
                    name="color_hex" 
                    value={color}
                    onChange={(e) => {
                      const val = e.target.value;
                      setColor(val);
                    }}
                    placeholder="#000000"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-white/20" 
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isPending}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed select-none"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Projeto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
