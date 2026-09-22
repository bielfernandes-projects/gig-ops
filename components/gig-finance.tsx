'use client';

import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { addExpense, deleteExpense, addPayment, deletePayment, setTrackReceipts } from '@/app/actions/finance-actions';
import { EXPENSE_CATEGORIES, brl } from '@/lib/finance';

export type ExpenseRow = { id: string; category: string; description: string | null; amount: number };
export type PaymentRow = { id: string; amount: number; paid_at: string; note: string | null };

type Props = {
  gigId: string;
  gross: number;
  trackReceipts: boolean;
  expenses: ExpenseRow[];
  payments: PaymentRow[];
};

const inputCls =
  'bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 placeholder-zinc-600';
const btnCls = 'bg-zinc-100 hover:bg-white text-zinc-900 font-bold px-4 py-2 rounded-md text-sm transition-colors';

async function submit(action: (fd: FormData) => Promise<{ error?: string } | undefined>, form: HTMLFormElement, okMsg: string) {
  const res = await action(new FormData(form));
  if (res?.error) toast.error(res.error);
  else {
    toast.success(okMsg);
    form.reset();
  }
}

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');

export function GigFinance({ gigId, gross, trackReceipts, expenses, payments }: Props) {
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const received = payments.reduce((sum, p) => sum + p.amount, 0);
  const pct = gross > 0 ? Math.min(100, Math.round((received / gross) * 100)) : 0;

  return (
    <section className="mb-10 grid gap-6 md:grid-cols-2">
      {/* Recebimentos do contratante */}
      <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-200">Recebimento do contratante</h2>

        {!trackReceipts ? (
          <>
            <p className="mb-4 text-xs text-zinc-500">
              Hoje o cachê bruto ({brl(gross)}) conta como recebido por inteiro. Ative o controle para registrar sinal e restante.
            </p>
            <button
              type="button"
              onClick={async () => {
                const res = await setTrackReceipts(gigId, true);
                if (res?.error) toast.error(res.error);
              }}
              className={btnCls}
            >
              Controlar sinal e restante
            </button>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-zinc-500">
              Recebido {brl(received)} de {brl(gross)}
              {received < gross ? ` (faltam ${brl(gross - received)})` : ''}
            </p>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-zinc-100" style={{ width: `${pct}%` }} />
            </div>

            <ul className="mb-4 divide-y divide-zinc-800">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-zinc-300">
                    {fmtDate(p.paid_at)}
                    {p.note ? ` · ${p.note}` : ''}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums text-zinc-100">{brl(p.amount)}</span>
                    <a href={`/gigs/${gigId}/recibo?p=${p.id}`} className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-200">
                      Recibo
                    </a>
                    <button
                      type="button"
                      title="Remover"
                      onClick={async () => {
                        const res = await deletePayment(p.id, gigId);
                        if (res?.error) toast.error(res.error);
                      }}
                      className="p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
              {payments.length === 0 && <li className="py-2 text-xs text-zinc-500">Nenhum recebimento registrado ainda.</li>}
            </ul>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(addPayment, e.currentTarget, 'Recebimento registrado.');
              }}
              className="flex flex-col gap-2"
            >
              <input type="hidden" name="gig_id" value={gigId} />
              <div className="flex flex-wrap gap-2">
                <input name="amount" required inputMode="decimal" placeholder="Valor (R$)" className={`${inputCls} min-w-0 flex-1`} />
                <input name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={`${inputCls} w-40 shrink-0`} />
              </div>
              <div className="flex gap-2">
                <input name="note" placeholder="Observação (ex: sinal)" className={`${inputCls} w-full min-w-0`} />
                <button type="submit" className={btnCls}>Registrar</button>
              </div>
            </form>

            <button
              type="button"
              onClick={async () => {
                const res = await setTrackReceipts(gigId, false);
                if (res?.error) toast.error(res.error);
              }}
              className="mt-3 text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-300"
            >
              Voltar ao modo simples
            </button>
          </>
        )}
      </div>

      {/* Despesas do show */}
      <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-200">Despesas do show</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Além do cachê dos músicos e do som. Total: <span className="font-semibold text-zinc-300">{brl(expensesTotal)}</span>
        </p>

        <ul className="mb-4 divide-y divide-zinc-800">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate text-zinc-300">
                {e.category}
                {e.description ? ` · ${e.description}` : ''}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-semibold tabular-nums text-zinc-100">{brl(e.amount)}</span>
                <button
                  type="button"
                  title="Remover"
                  onClick={async () => {
                    const res = await deleteExpense(e.id, gigId);
                    if (res?.error) toast.error(res.error);
                  }}
                  className="p-1 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
          {expenses.length === 0 && <li className="py-2 text-xs text-zinc-500">Nenhuma despesa registrada.</li>}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(addExpense, e.currentTarget, 'Despesa registrada.');
          }}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="gig_id" value={gigId} />
          <div className="flex flex-wrap gap-2">
            <select name="category" required defaultValue="" className={`${inputCls} min-w-0 flex-1 appearance-none`}>
              <option value="" disabled>Categoria</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input name="amount" required inputMode="decimal" placeholder="Valor (R$)" className={`${inputCls} w-36 shrink-0`} />
          </div>
          <div className="flex gap-2">
            <input name="description" placeholder="Descrição (opcional)" className={`${inputCls} w-full min-w-0`} />
            <button type="submit" className={btnCls}>Adicionar</button>
          </div>
        </form>
      </div>
    </section>
  );
}
