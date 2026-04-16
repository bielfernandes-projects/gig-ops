'use client';

import { useState } from 'react';
import { X, Loader2, Pencil, Trash2 } from 'lucide-react';
import { removeFromLineup, updateLineupFee } from '@/app/actions/gig-actions';
import { LineupWithMember } from '@/lib/types';
import { TogglePaymentButton } from '@/app/gigs/[id]/toggle-payment-button';
import { toast } from 'sonner';

interface LineupMemberCardProps {
  freela: LineupWithMember;
  gigId: string;
  role: string;
}

export function LineupMemberCard({ freela, gigId, role }: LineupMemberCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);
  const [isPendingEdit, setIsPendingEdit] = useState(false);
  const [isPendingDelete, setIsPendingDelete] = useState(false);

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPendingEdit(true);
    const formData = new FormData(e.currentTarget);
    formData.append('lineup_id', freela.id);
    formData.append('gig_id', gigId);

    const res = await updateLineupFee(formData);

    if (res.error) {
      toast.error(`Erro ao atualizar cachê: ${res.error}`);
      setIsPendingEdit(false);
    } else {
      setIsEditing(false);
      setIsPendingEdit(false);
      toast.success('Cachê atualizado!');
    }
  };

  const handleDelete = async () => {
    setIsPendingDelete(true);
    const res = await removeFromLineup(freela.id, gigId);

    if (res.error) {
      toast.error(`Erro ao remover músico: ${res.error}`);
      setIsPendingDelete(false);
      setIsConfirmDelete(false);
    } else {
      toast.success(`${freela.go_members?.name || 'Músico'} removido da escala.`);
      setIsConfirmDelete(false);
      setIsPendingDelete(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:bg-zinc-900 transition-colors group">
        {/* Left: Name & Instrument */}
        <div className="flex flex-col gap-1 h-full justify-center min-w-0 flex-1 mr-3">
          <span className="font-bold text-zinc-50 text-base truncate">
            {freela.go_members?.name || 'Músico Desconhecido'}
          </span>
          <span className="text-xs font-medium text-zinc-500">
            {freela.go_members?.instrument || 'Instrumento'}
          </span>
        </div>

        {/* Right: Fee + Toggle + Actions */}
        {role === 'admin' && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-end gap-1.5">
              <span className="font-semibold text-zinc-300 tabular-nums">
                R$ {freela.fee_amount.toFixed(2)}
              </span>
              <TogglePaymentButton
                lineupId={freela.id}
                currentStatus={freela.status === 'pago'}
                role={role}
              />
            </div>

            <div className="flex flex-col gap-1.5 border-l border-zinc-800 pl-3">
              <button
                onClick={() => setIsEditing(true)}
                title="Editar cachê"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors select-none"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsConfirmDelete(true)}
                title="Remover da escala"
                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors select-none"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Fee Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isPendingEdit && setIsEditing(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-100">Editar Cachê</h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {freela.go_members?.name} — {freela.go_members?.instrument}
                </p>
              </div>
              <button
                onClick={() => !isPendingEdit && setIsEditing(false)}
                disabled={isPendingEdit}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`fee-${freela.id}`} className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Cachê Acordado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 text-sm font-semibold">R$</span>
                  </div>
                  <input
                    type="number"
                    id={`fee-${freela.id}`}
                    name="agreed_fee"
                    defaultValue={freela.fee_amount}
                    step="0.01"
                    inputMode="decimal"
                    required
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPendingEdit}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed select-none"
              >
                {isPendingEdit ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Cachê'}
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
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">Remover da Escala?</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  <span className="font-semibold text-zinc-200">{freela.go_members?.name}</span> será removido desta gig. Esta ação não pode ser desfeita.
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
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-red-500 hover:bg-red-400 text-white font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed select-none"
                >
                  {isPendingDelete ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Remover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
