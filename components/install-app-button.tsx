'use client';

import { useSyncExternalStore } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

// Chrome/Android fire this once per page load, possibly before a nav mounts: keep it at module level.
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
// Server and first client render say "hidden", so the markup matches; the real answer comes right after.
const getSnapshot = () => !isInstalled();
const getServerSnapshot = () => false;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** "Install the app" shortcut. Hidden once the app runs installed (standalone). */
export function InstallAppButton({ className = '', iconClassName = 'h-5 w-5' }: { className?: string; iconClassName?: string }) {
  const show = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!show) return null;

  async function install() {
    if (deferred) {
      const ev = deferred;
      deferred = null;
      await ev.prompt();
      await ev.userChoice;
      return emit();
    }
    toast.info(
      isIos()
        ? 'No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".'
        : 'Abra o menu do navegador e escolha "Instalar app" ou "Adicionar à tela inicial".'
    );
  }

  return (
    <button type="button" onClick={install} aria-label="Instalar o app" title="Instalar o app" className={className}>
      <Download className={iconClassName} />
    </button>
  );
}
