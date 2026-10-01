/**
 * Textos do push diário das atualizações do app. Um por dia, em rodízio, pra não chegar sempre a
 * mesma frase. O título é fixo; o corpo muda.
 */
export const UPDATE_PUSH_TITLE = 'Novidade no Gigueiros';

const UPDATE_PUSH_BODIES = [
  'Tem atualização fresquinha no app. Toque aqui e venha conferir!',
  'O Gigueiros ficou melhor. Veja o que mudou!',
  'Novidades no ar! Dá uma olhada no sininho.',
  'Mexemos no app pra facilitar a vida da banda. Toque para ver.',
  'Saiu coisa nova no Gigueiros. Vem ver!',
];

/** Escolhe pelo número do dia, então dois dias seguidos nunca repetem a frase. */
export function updatePushBody(now = new Date()): string {
  const day = Math.floor(now.getTime() / 86_400_000);
  return UPDATE_PUSH_BODIES[day % UPDATE_PUSH_BODIES.length];
}
