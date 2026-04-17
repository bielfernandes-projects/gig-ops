'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Trash2, Settings, Volume2, VolumeX } from 'lucide-react';
import { DateTimePicker } from './date-time-picker';
import { updateGig, deleteGig } from '@/app/actions/gig-actions';
import { GigWithProject, GoProject, GoMember } from '@/lib/types';
import { toast } from 'sonner';

interface EditGigModalProps {
  gig: GigWithProject;
  projects: GoProject[];
  members: GoMember[];
}

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EditGigModal({ gig, projects, members }: EditGigModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);
  const [isPendingSave, setIsPendingSave] = useState(false);
  const [isPendingDelete, setIsPendingDelete] = useState(false);
  const [bringSound, setBringSound] = useState(gig.bring_sound ?? false);

  // Hide global navigation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('modal-open');
    } else {
      document.documentElement.classList.remove('modal-open');
    }
    return () => document.documentElement.classList.remove('modal-open');
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPendingSave(true);
    const formData = new FormData(e.currentTarget);
    formData.set('id', gig.id);
    formData.set('bring_sound', String(bringSound));

    const res = await updateGig(formData);

    if (res?.error) {
      toast.error(`Erro ao salvar: ${res.error}`);
      setIsPendingSave(false);
    } else {
      setIsOpen(false);
      setIsPendingSave(false);
      toast.success('Gig atualizada com sucesso!');
    }
  };

  const handleDelete = async () => {
    setIsPendingDelete(true);
    try {
      await deleteGig(gig.id); // redirects to / on success
    } catch {
      // redirect() throws — this is normal Next.js behavior
    }
  };

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        title="Editar Gig"
        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors select-none"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Editar Gig</span>
      </button>

      {/* Edit Modal */}
      {isOpen && !isConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isPendingSave && setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 my-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-100">Editar Gig</h2>
                <p className="text-sm text-zinc-500 mt-0.5 truncate max-w-[220px]">{gig.title}</p>
              </div>
              <button
                onClick={() => !isPendingSave && setIsOpen(false)}
                disabled={isPendingSave}
                className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gig-title" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Título do Show
                </label>
                <input
                  type="text"
                  id="gig-title"
                  name="title"
                  defaultValue={gig.title}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>

              {/* Project */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gig-project" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Formato / Projeto
                </label>
                <select
                  id="gig-project"
                  name="project_id"
                  defaultValue={gig.project_id}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Date / Start */}
              <DateTimePicker
                name="start_time"
                label="Início"
                defaultValue={toDatetimeLocal(gig.start_time)}
                required
              />

              {/* End time */}
              <DateTimePicker
                name="end_time"
                label="Término (opcional)"
                defaultValue={gig.end_time ? toDatetimeLocal(gig.end_time) : ''}
              />

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gig-location" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Endereço / Local
                </label>
                <input
                  type="text"
                  id="gig-location"
                  name="location"
                  defaultValue={gig.location}
                  placeholder="Ex: Rua das Flores, 100 – São Paulo"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                />
              </div>

              {/* Gross Value */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gig-gross" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Cachê Bruto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 text-sm font-semibold">R$</span>
                  </div>
                  <input
                    type="number"
                    id="gig-gross"
                    name="gross_value"
                    defaultValue={gig.gross_value}
                    step="0.01"
                    inputMode="decimal"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Sound Equipment Toggle */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {bringSound
                      ? <Volume2 className="w-5 h-5 text-amber-400" />
                      : <VolumeX className="w-5 h-5 text-zinc-500" />
                    }
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Levar Equipamento de Som?</p>
                      <p className="text-xs text-zinc-500">
                        {bringSound ? 'Sim — informe o custo abaixo' : 'Não é necessário'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBringSound(!bringSound)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      bringSound ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      bringSound ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Sound Cost — only shown when bringSound is true */}
                {bringSound && (
                  <div className="mt-4 flex flex-col gap-3">
                    {/* Sound cost */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="gig-sound-cost" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                        Custo do Som
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-zinc-500 text-sm font-semibold">R$</span>
                        </div>
                        <input
                          type="number"
                          id="gig-sound-cost"
                          name="sound_cost"
                          defaultValue={gig.sound_cost ?? 0}
                          step="0.01"
                          inputMode="decimal"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Sound person */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="gig-sound-person" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                        Responsável pelo Som
                      </label>
                      <select
                        id="gig-sound-person"
                        name="sound_person_id"
                        defaultValue={gig.sound_person_id ?? ''}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none"
                      >
                        <option value="">Nenhum (a definir)</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {m.instrument}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gig-notes" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Observações <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <textarea 
                  id="gig-notes" 
                  name="notes" 
                  rows={3}
                  defaultValue={gig.notes ?? ''}
                  placeholder="Contratante, consumação, orientações..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none placeholder:text-zinc-700"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isPendingSave}
                className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed select-none"
              >
                {isPendingSave ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600 uppercase tracking-widest">Zona de Perigo</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => setIsConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold transition-colors select-none"
              >
                <Trash2 className="w-4 h-4" />
                Cancelar e Excluir Gig
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {isConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isPendingDelete && setIsConfirmDelete(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">Excluir esta Gig?</h2>
                <p className="text-sm text-zinc-400 mt-2">
                  <span className="font-semibold text-zinc-200">{gig.title}</span> será excluída permanentemente junto com toda a sua escala de músicos. Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setIsConfirmDelete(false)}
                  disabled={isPendingDelete}
                  className="flex-1 py-2.5 rounded-md border border-zinc-700 text-zinc-300 font-semibold hover:bg-zinc-900 transition-colors disabled:opacity-50 select-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPendingDelete}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed select-none"
                >
                  {isPendingDelete ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
