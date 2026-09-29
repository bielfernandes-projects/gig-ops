'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { claimPremiumNotice } from '@/app/actions/premium-actions';
import { shouldTrack } from '@/components/screen-tracker';

/**
 * Avisa o Dono, uma vez, quando a banda vira Premium. Montado no layout raiz: roda na primeira tela
 * do app de cada carregamento (login incluso) e de novo depois de sair e entrar, pois a tela de
 * fora do app zera a trava. A decisão de mostrar fica no servidor (`claimPremiumNotice`).
 */
export function PremiumNotice() {
  const pathname = usePathname();
  const checked = useRef(false);

  useEffect(() => {
    if (!shouldTrack(pathname)) {
      checked.current = false;
      return;
    }
    if (checked.current) return;
    checked.current = true;

    claimPremiumNotice()
      .then(({ bands }) => {
        if (bands.length === 0) return;
        toast.success('Premium desbloqueado', {
          description: bands.length === 1 ? `A assinatura da banda "${bands[0]}" está ativa. Obrigado por fazer parte!` : `A assinatura das bandas ${bands.map((b) => `"${b}"`).join(', ')} está ativa. Obrigado por fazer parte!`,
          duration: 12000,
        });
      })
      .catch(() => {
        // Sem rede ou sessão caída: o aviso fica pendente (a trava não foi gravada) e vem no próximo carregamento.
      });
  }, [pathname]);

  return null;
}
