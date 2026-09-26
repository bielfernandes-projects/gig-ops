'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Telas de fora do app: marketing, login e link público de repertório não são uso do produto. */
const IGNORED = ['/', '/login', '/termos', '/privacidade'];
const IGNORED_PREFIXES = ['/s/', '/auth/', '/admin', '/api/'];

const shouldTrack = (path: string) => !IGNORED.includes(path) && !IGNORED_PREFIXES.some((p) => path.startsWith(p));

/**
 * Registra cada navegação dentro do app (tabela `app_events`, painel em /admin). Montado uma vez no
 * layout raiz. `keepalive` pra sobreviver à navegação que a disparou, e nada é esperado: a
 * telemetria não pode atrasar nem quebrar a tela.
 */
export function ScreenTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldTrack(pathname) || lastSent.current === pathname) return;
    lastSent.current = pathname;

    void fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {
      // Offline, aba fechando, bloqueador: perder um evento é aceitável, avisar o usuário não.
    });
  }, [pathname]);

  return null;
}
