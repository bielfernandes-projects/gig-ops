'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getServerTheme, getTheme, setTheme, subscribeTheme } from '@/lib/theme';

export function ThemeToggle() {
  // null on the server and on the first client render (see getServerTheme): drawing nothing
  // until then is what keeps the markup identical on both sides.
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  if (!theme) return null;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="shrink-0 p-2.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
