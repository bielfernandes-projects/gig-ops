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
