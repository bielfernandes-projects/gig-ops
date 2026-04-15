'use client';

import { useState } from 'react';
import { GoMember } from '@/lib/types';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { updateMember } from '@/app/actions/member-actions';
import { toast } from 'sonner';

export function MemberCard({ member, role }: { member: GoMember; role: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    formData.append('id', member.id);
    
    const res = await updateMember(formData);
    
    if (res.error) {
      toast.error(`Erro ao editar músico: ${res.error}`);
      setIsPending(false);
    } else {
      setIsEditing(false);
      setIsPending(false);
      toast.success('Músico atualizado com sucesso!');
    }
  };

  return (
    <>
      <div className={`flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 group transition-colors select-none ${role === 'admin' ? 'hover:bg-zinc-800 cursor-pointer' : ''}`}>
        <div 
          className="flex flex-col flex-1"
          onClick={() => { if (role === 'admin') setIsEditing(true) }}
        >
          <h3 className="font-bold text-zinc-100 text-base">{member.name}</h3>
          <span className="text-xs uppercase font-semibold text-zinc-500 tracking-wider">
            {member.instrument}
          </span>
        </div>
        
        {member.phone ? (
          <a 
            href={`https://wa.me/${member.phone}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-10 h-10 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors rounded-full shrink-0"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
        ) : (
          <div className="w-10 h-10 opacity-0 shrink-0" />
        )}
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
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Editar Músico</h2>
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
                <label htmlFor={`edit-name-${member.id}`} className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Nome do Músico
                </label>
                <input 
                  type="text" 
                  id={`edit-name-${member.id}`} 
                  name="name" 
                  defaultValue={member.name}
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={`edit-instrument-${member.id}`} className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Instrumento Principal
                </label>
                <input 
                  type="text" 
                  id={`edit-instrument-${member.id}`} 
                  name="instrument" 
                  defaultValue={member.instrument}
                  required 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                />
              </div>

               <div className="flex flex-col gap-1.5">
                <label htmlFor={`edit-phone-${member.id}`} className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  WhatsApp (Opcional)
                </label>
                <input 
                  type="tel" 
                  id={`edit-phone-${member.id}`} 
                  name="phone" 
                  inputMode="tel"
                  defaultValue={member.phone || ''}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                  placeholder="Ex: 11999999999"
                />
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
