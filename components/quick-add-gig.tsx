'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Copy } from 'lucide-react';
import { DateTimePicker } from './date-time-picker';
import { addQuickGig } from '@/app/actions/gig-actions';
import { GoGig, GoProject } from '@/lib/types';
import { toast } from 'sonner';

export function QuickAddGig({ projects, cloneData }: { projects: GoProject[]; cloneData?: Partial<GoGig> | null }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const isClone = !!cloneData;

  // Auto-open when cloneData is provided and clear the URL param
  useEffect(() => {
    if (cloneData) {
      setIsOpen(true);
      // Clean the URL so refresh doesn't re-trigger the clone
      const url = new URL(window.location.href);
      url.searchParams.delete('cloneId');
      window.history.replaceState({}, '', url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide global navigation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('modal-open');
    } else {
      document.documentElement.classList.remove('modal-open');
    }
    return () => document.documentElement.classList.remove('modal-open');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    // Server Action executed BEFORE closing to handle errors gracefully
    const res = await addQuickGig(formData);
    
    if (res.error) {
      toast.error(`Erro ao salvar: ${res.error}`);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      toast.success(isClone ? 'Gig duplicada com sucesso!' : 'Gig agendada com sucesso!');
      // If we came from a clone, go back to clean URL
      if (isClone) router.push('/');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[88px] md:bottom-10 right-4 md:right-10 z-40 flex items-center justify-center w-14 h-14 bg-zinc-100 text-zinc-900 rounded-full hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl select-none"
        title="Nova Gig"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isPending && setIsOpen(false)}
            aria-hidden="true"
          />
          
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 my-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {isClone && <Copy className="w-4 h-4 text-emerald-400" />}
                <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                  {isClone ? 'Duplicar Gig' : 'Novo Show'}
                </h2>
              </div>
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
                <label htmlFor="title" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Título
                </label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  required 
                  autoFocus={!isClone}
                  defaultValue={cloneData?.title ?? ''}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
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
                  defaultValue={cloneData?.project_id ?? ''}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                >
                  <option value="" disabled>Selecione o Projeto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <DateTimePicker
                name="start_time"
                label="Início"
                required
              />

              <DateTimePicker
                name="end_time"
                label="Término (opcional)"
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gross_value" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Valor Bruto (Cachê)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 text-sm font-semibold">R$</span>
                  </div>
                  <input 
                    type="number" 
                    id="gross_value" 
                    name="gross_value" 
                    inputMode="decimal"
                    placeholder="0.00"
                    step="0.01"
                    required 
                    defaultValue={cloneData?.gross_value ?? ''}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Observações <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <textarea 
                  id="notes" 
                  name="notes" 
                  rows={2}
                  placeholder="Contratante, consumação..."
                  defaultValue={cloneData?.notes ?? ''}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none placeholder:text-zinc-700"
                />
              </div>

              <button 
                type="submit" 
                disabled={isPending}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed select-none"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Gig'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
