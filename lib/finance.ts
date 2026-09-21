/** Presets shown in the forms. Stored as free text, so older or custom values keep working. */
export const EVENT_TYPES = [
  'Casamento',
  'Bar / Restaurante',
  'Festa privada',
  'Corporativo',
  'Show em palco',
  'Ensaio',
  'Gravação',
  'Outro',
] as const;

export const EXPENSE_CATEGORIES = ['Músicos', 'Som', 'Iluminação', 'Transporte', 'Alimentação', 'Merch', 'Outros'] as const;

export const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export type FinanceInputs = {
  gross: number;
  lineupCost: number;
  soundCost: number;
  expenses: number;
  /** True when the owner tracks partial receipts (sinal e restante) for this gig. */
  trackReceipts: boolean;
  received: number;
};

/** Money math for one gig. Without receipt tracking the gross counts as fully received (legacy behaviour). */
export function gigFinance(i: FinanceInputs) {
  const totalCost = i.lineupCost + i.soundCost + i.expenses;
  const receivedAmount = i.trackReceipts ? Math.min(i.received, i.gross) : i.gross;
  return {
    totalCost,
    profit: i.gross - totalCost,
    received: receivedAmount,
    pending: Math.max(0, i.gross - receivedAmount),
  };
}

export type ProfitOwner = { id: string; share: number | null };

/**
 * Splits a profit among the band owners. `share` is a percentage; owners without one split the
 * remaining percentage equally. If the defined shares add up to more than 100 they are scaled down.
 * Returns percentages and amounts (amounts are rounded to cents; the last owner absorbs the rounding).
 */
export function splitProfit(profit: number, owners: ProfitOwner[]): { id: string; percent: number; amount: number }[] {
  if (owners.length === 0) return [];

  const defined = owners.filter((o) => o.share !== null);
  const undefinedCount = owners.length - defined.length;
  const definedSum = defined.reduce((s, o) => s + (o.share as number), 0);

  const scale = definedSum > 100 ? 100 / definedSum : 1;
  const remaining = Math.max(0, 100 - definedSum * scale);
  const each = undefinedCount > 0 ? remaining / undefinedCount : 0;

  const percents = owners.map((o) => (o.share !== null ? (o.share as number) * scale : each));
  const total = percents.reduce((s, p) => s + p, 0) || 1;

  let allocated = 0;
  return owners.map((o, i) => {
    const percent = (percents[i] / total) * 100;
    const isLast = i === owners.length - 1;
    const amount = isLast ? Math.round((profit - allocated) * 100) / 100 : Math.round(((profit * percent) / 100) * 100) / 100;
    allocated += amount;
    return { id: o.id, percent, amount };
  });
}
