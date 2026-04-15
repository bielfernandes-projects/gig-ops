'use client';

import { useState } from 'react';
import { GoProject } from '@/lib/types';
import { X, Loader2 } from 'lucide-react';
import { updateProject } from '@/app/actions/project-actions';
import { toast } from 'sonner';

export function ProjectCard({ project, role }: { project: GoProject; role: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    formData.append('id', project.id);
    
    const res = await updateProject(formData);
    
    if (res.error) {
      toast.error(`Erro ao editar projeto: ${res.error}`);
      setIsPending(false);
    } else {
      setIsEditing(false);
      setIsPending(false);
      toast.success('Projeto atualizado com sucesso!');
    }
  };

  return (
    <>
      <div 
        onClick={() => { if (role === 'admin') setIsEditing(true) }}
        className={`flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5 transition-colors select-none ${role === 'admin' ? 'hover:bg-zinc-800 cursor-pointer' : ''}`}
      >
        <div 
          className="w-10 h-10 rounded-full flex-shrink-0 shadow-sm border border-zinc-700/50" 
          style={{ backgroundColor: project.color_hex }}
        />
        <div className="flex flex-col">
          <h3 className="font-bold text-zinc-100 text-lg">{project.name}</h3>
          <span className="text-xs uppercase font-semibold text-zinc-500 tracking-wider">
            {project.color_hex}
          </span>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isPending && setIsEditing(false)}
            aria-hidden="true"
          />
          
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Editar Projeto</h2>
              <button 
                onClick={() => !isPending && setIsEditing(false)}
                disabled={isPending}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`edit-name-${project.id}`} className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Nome do Formato
                </label>
                <input 
                  type="text" 
                  id={`edit-name-${project.id}`}
                  name="name" 
                  defaultValue={project.name}
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={`edit-color-${project.id}`} className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Cor do Badge
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    id={`edit-color-${project.id}`}
                    name="color_hex" 
                    defaultValue={project.color_hex}
                    required 
                    className="w-12 h-10 p-0 border-0 bg-transparent rounded-md cursor-pointer"
                  />
                  <span className="text-sm text-zinc-500">Selecione uma cor para identificar o projeto</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isPending}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed select-none"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
