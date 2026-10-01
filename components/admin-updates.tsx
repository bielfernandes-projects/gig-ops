'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { createAppUpdate, deleteAppUpdate } from '@/app/admin/actions';
import { UPDATE_KINDS, UPDATE_LABEL } from '@/lib/notification-model';
import { dayKey } from '@/lib/time';

const field = 'w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none';

/** Formulário de lançamento de uma atualização do app (tipo, título, data e descrição). */
export function AdminUpdateForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState(() => dayKey());
  const [notify, setNotify] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await createAppUpdate({ kind, title, body, date, notify });
    setPending(false);
    if ('error' in res) return toast.error(res.error);
    toast.success(res.pushed > 0 ? `Atualização lançada. Push enviado para ${res.pushed} ${res.pushed === 1 ? 'aparelho' : 'aparelhos'}.` : 'Atualização lançada. Aparece no pop-up de cada pessoa na próxima vez que abrir o app.');
    setKind('');
    setTitle('');
    setBody('');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value)} required className={field}>
            <option value="" disabled>Selecione</option>
            {UPDATE_KINDS.map((k) => (
              <option key={k} value={k}>{UPDATE_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={field} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
        Título
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className={field} placeholder="Ex: Importação de gigs por planilha ou texto" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
        Descrição
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required maxLength={2000} rows={4} className={field} placeholder="Conte o que mudou, em linguagem simples." />
      </label>
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-300">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
          Enviar push agora (só para urgência)
        </label>
        <p className="text-[11px] text-zinc-500">Desmarcado, o push sai sozinho amanhã às 8h, um só para todas as atualizações lançadas até lá.</p>
      </div>
      <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 self-start rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-white disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lançar atualização'}
      </button>
    </form>
  );
}

export function AdminUpdateDelete({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const res = await deleteAppUpdate(id);
    setPending(false);
    if ('error' in res) return toast.error(res.error);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} aria-label="Apagar atualização" className="rounded p-1.5 text-zinc-500 hover:text-red-400">
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs">
      <button type="button" onClick={remove} disabled={pending} className="font-semibold text-red-400 hover:text-red-300">{pending ? 'Apagando...' : 'Apagar'}</button>
      <button type="button" onClick={() => setConfirming(false)} className="text-zinc-500 hover:text-zinc-300">Cancelar</button>
    </span>
  );
}
