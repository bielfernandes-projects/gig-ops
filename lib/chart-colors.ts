/** Cores dos gráficos do Relatório, legíveis sobre o fundo escuro. */
export const CHART_PALETTE = ['#34d399', '#38bdf8', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171'];

/** Gig sem projeto (mesmo cinza do Dashboard). */
export const NO_PROJECT_COLOR = '#71717a';

export const colorAt = (index: number) => CHART_PALETTE[index % CHART_PALETTE.length];
