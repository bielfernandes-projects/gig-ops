'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { grantPremium, revokePremium } from '@/app/admin/actions';
import type { AdminUserBand } from '@/lib/admin-stats';

const STATE_LABEL = { trial: 'teste', active: 'ativa', expired: 'expirada' } as const;
const STATE_TONE = { trial: 'text-amber-300', active: 'text-emerald-400', expired: 'text-red-400' } as const;

const PRAZOS: { label: string; days: number | null }[] = [
  { label: 'sem prazo', days: null },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/**
 * Estado da assinatura de uma banda e o controle de acesso de cortesia. Só aparece pra banda da qual
 * a pessoa é **dona** — a assinatura é da banda, e um músico não responde por ela.
 */
export function AdminBandAccess({ band, canManage }: { band: AdminUserBand; canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState(false);

  const run = (fn: () => Promise<{ error?: string } | undefined>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else {
        toast.success(ok);
        setChoosing(false);
      }
    });

  /** Ativa sem prazo e sem Stripe = cortesia. Com paid_until, é cortesia com validade. */
  const isComped = band.state === 'active' && !band.hasStripe;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="text-zinc-300">{band.name}</span>
      <span className="text-zinc-600">· {band.role === 'owner' ? 'dono' : 'músico'} ·</span>
      <span className={STATE_TONE[band.state]}>{STATE_LABEL[band.state]}</span>

      {band.hasStripe && <span className="text-zinc-600">· cartão (Stripe)</span>}
      {isComped && <span className="text-zinc-600">· liberada {band.paidUntil ? `até ${shortDate(band.paidUntil)}` : 'sem prazo'}</span>}

      {!canManage || band.hasStripe ? null : choosing ? (
        <span className="flex items-center gap-1">
          {PRAZOS.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={pending}
              onClick={() => run(() => grantPremium(band.id, p.days), `"${band.name}" liberada (${p.label}).`)}
              className="rounded border border-emerald-600/50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-600/10 disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => setChoosing(false)}
            className="px-1 text-[11px] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
          >
            cancelar
          </button>
        </span>
      ) : isComped ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => revokePremium(band.id), `Acesso de "${band.name}" revogado.`)}
          className="rounded border border-zinc-700 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
        >
          revogar
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setChoosing(true)}
          className="rounded border border-emerald-600/50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-600/10 disabled:opacity-50"
        >
          liberar premium
        </button>
      )}
    </div>
  );
}
