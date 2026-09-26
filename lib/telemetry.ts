import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Telemetria do produto (tabela `app_events`, painel em /admin). Duas regras valem sempre:
 * escrever com o service role, porque a tabela não aceita escrita do cliente, e **nunca** deixar
 * uma falha aqui derrubar a ação do usuário — ninguém perde um show cadastrado porque o log falhou.
 */

export type EventKind = 'screen' | 'action';

/**
 * Nomes de ações-chave. Ficam num tipo fechado pra não virar string solta: um nome trocado por
 * descuido quebra a agregação do painel sem quebrar nada visível.
 */
export type ActionName =
  | 'gig_criado'
  | 'cache_pago'
  | 'presenca_confirmada'
  | 'presenca_recusada'
  | 'musico_cadastrado'
  | 'musica_criada'
  | 'repertorio_criado'
  | 'banda_criada'
  | 'entrou_na_banda';

type LogInput = {
  kind: EventKind;
  name: string;
  userId?: string | null;
  bandId?: string | null;
};

export async function logEvent({ kind, name, userId, bandId }: LogInput): Promise<void> {
  try {
    await createAdminClient()
      .from('app_events')
      .insert({ kind, name, user_id: userId ?? null, band_id: bandId ?? null });
  } catch (e) {
    console.warn('telemetria: falha ao gravar evento', name, e);
  }
}

/** Açúcar pro caso mais comum, com o nome validado pelo tipo. */
export function logAction(name: ActionName, userId?: string | null, bandId?: string | null): Promise<void> {
  return logEvent({ kind: 'action', name, userId, bandId });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Caminho agregável: troca ids por `:id`, senão cada show visitado vira uma "tela" diferente e a
 * pergunta "quais telas são mais usadas" não tem resposta. `/gigs/8f2c…` → `/gigs/:id`.
 */
export function normalizeScreen(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean).map((seg) => (UUID.test(seg) || /^\d+$/.test(seg) ? ':id' : seg));
  return '/' + parts.join('/');
}
