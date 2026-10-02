/**
 * Tipos de conta e seus limites. Uma banda ("contêiner") é de um tipo só, escolhido na criação:
 * - `banda`: equipe, escala, despesas, divisão de lucro, convites. Sem limite de repertório.
 * - `freela`: uma pessoa que toca para várias bandas. Sem equipe; limites de repertório.
 * Client-safe: nada de servidor aqui.
 */
export type BandKind = 'banda' | 'freela';

export const KIND_LABEL: Record<BandKind, string> = { banda: 'Banda', freela: 'Freela' };

/** Limites do Freela no repertório: o catálogo inteiro e as listas montadas a partir dele. */
export const FREELA_LIMITS = { songs: 150, setlists: 3 } as const;

/** Importações por IA por conta e mês (gigs e repertório somados). */
export const IMPORT_QUOTA = 20;

export const FREELA_NO_TEAM = 'Esta conta é Freela: não tem equipe, escala, despesas nem divisão de lucro. Para isso, use uma conta Banda.';

export const isFreela = (kind: BandKind | null | undefined) => kind === 'freela';

export function songLimitMessage(): string {
  return `A conta Freela guarda até ${FREELA_LIMITS.songs} músicas no catálogo. Para mais, use uma conta Banda.`;
}

export function setlistLimitMessage(): string {
  return `A conta Freela tem até ${FREELA_LIMITS.setlists} repertórios. Para mais, use uma conta Banda.`;
}
