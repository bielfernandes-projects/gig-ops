'use client';

import { useState } from 'react';
import { useJoyride, STATUS, type Status, type Step } from 'react-joyride';
import { NAV_EVENT } from '@/components/mobile-nav';

const STORAGE_KEY = (role: string) => `gg-tour-v1:${role}`;

/** Both navs (desktop sidebar and mobile bottom bar) are in the DOM; point at whichever is visible. */
const navItem = (href: string) => () =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-nav="${href}"]`)).find((el) => el.getClientRects().length > 0) ?? null;

const isPhone = () => window.matchMedia('(max-width: 767px)').matches;
/** On phones the menu items live in a drawer: open/close it around the steps that point at them. */
const drawer = (open: boolean) => async () => {
  if (!isPhone()) return;
  window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: open }));
  if (open) await new Promise((r) => setTimeout(r, 350));
};

const welcome = (content: string): Step => ({ target: 'body', placement: 'center', title: 'Bem-vindo ao Gigueiros!', content, before: drawer(false) });
const nav = (href: string, title: string, content: string): Step => ({ target: navItem(href), placement: 'auto', isFixed: true, title, content, before: drawer(true) });

const OWNER_STEPS: Step[] = [
  welcome('Em menos de 1 minuto te mostro o caminho pra tirar a banda da planilha e do grupo de WhatsApp.'),
  nav('/members', 'Comece pela equipe', 'Cadastre os músicos com instrumento. Quem tiver e-mail cadastrado vê os próprios shows e cachês no app.'),
  nav('/agenda', 'Crie os shows', 'Toque em "Novo Show", escale os músicos e defina o cachê de cada um. O lucro do show é calculado na hora.'),
  nav('/repertorio', 'Monte o repertório', 'Catálogo com cifra, tom e PDF e repertórios reutilizáveis: marque um como principal e ele já entra nos shows novos. No palco, use a letra grande.'),
  nav('/relatorio', 'Acompanhe o caixa', 'Faturamento, custos e lucro de cada mês, e o que ainda falta receber ou pagar.'),
  nav('/profile', 'Chame a banda', 'No Perfil fica o código de convite pros músicos entrarem, a sua assinatura e o botão pra rever este tour.'),
];

const MUSICIAN_STEPS: Step[] = [
  welcome('Aqui você acompanha os shows em que está escalado, sem precisar caçar mensagem no grupo.'),
  nav('/agenda', 'Seus shows', 'Todos os shows em que você está escalado. Abra um pra ver local, horário, seu cachê e confirmar presença.'),
  nav('/repertorio', 'Repertório', 'O repertório de cada show, no tom certo. No palco, use o modo de letra grande.'),
  nav('/relatorio', 'Seus cachês', 'Quanto você tem a receber, somando todas as bandas em que toca.'),
  nav('/profile', 'Não perca nenhum show', 'Ative as notificações no Perfil pra ser avisado quando for escalado. O tour pode ser revisto por lá também.'),
];

/**
 * First-run guided tour. Mounted client-only (next/dynamic, ssr: false) so reading localStorage
 * and the URL during the initial state is safe. `?tour=1` forces a replay (link in the Profile).
 */
export default function AppTour({ role }: { role: 'admin' | 'viewer' }) {
  const [run, setRun] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has('tour') || !localStorage.getItem(STORAGE_KEY(role));
    } catch {
      return false;
    }
  });

  const { Tour } = useJoyride({
    run,
    continuous: true,
    steps: role === 'admin' ? OWNER_STEPS : MUSICIAN_STEPS,
    options: {
      showProgress: true,
      skipBeacon: true,
      buttons: ['back', 'skip', 'primary'],
      primaryColor: '#10b981',
      backgroundColor: '#18181b',
      textColor: '#e4e4e7',
      arrowColor: '#18181b',
      overlayColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 10000,
    },
    locale: { back: 'Voltar', close: 'Fechar', last: 'Concluir', next: 'Próximo', nextWithProgress: 'Próximo ({current}/{total})', skip: 'Pular tour' },
    styles: {
      tooltip: { borderRadius: 16, border: '1px solid #27272a' },
      tooltipTitle: { fontWeight: 700 },
      buttonPrimary: { borderRadius: 8, fontWeight: 700, color: '#09090b' },
      buttonBack: { color: '#a1a1aa' },
      buttonSkip: { color: '#71717a' },
    },
    onEvent: (data) => {
      if (([STATUS.FINISHED, STATUS.SKIPPED] as Status[]).includes(data.status)) {
        try {
          localStorage.setItem(STORAGE_KEY(role), '1');
        } catch {}
        setRun(false);
        window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: false }));
        if (window.location.search.includes('tour')) window.history.replaceState(null, '', window.location.pathname);
      }
    },
  });

  return Tour;
}
