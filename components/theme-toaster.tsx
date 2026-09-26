'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { getServerTheme, getTheme, subscribeTheme } from '@/lib/theme';

const FORCED_DARK_ROUTES = ['/', '/login', '/onboarding', '/termos', '/privacidade'];

export function ThemeToaster() {
  const pathname = usePathname();
  const forcedDark = FORCED_DARK_ROUTES.includes(pathname) || pathname.startsWith('/auth');
  // null until hydration; the toggle notifies this store, so no MutationObserver is needed to
  // notice a theme change made elsewhere in the tree.
  const stored = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  const isDark = forcedDark || stored !== 'light';

  // Client-side navigations don't re-run the <head> FOUC script, so keep the
  // <html> class in sync with forcedDark across route changes too.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <Toaster
      theme={isDark ? 'dark' : 'light'}
      position="bottom-center"
      closeButton
      toastOptions={{
        style: {
          background: isDark ? '#18181b' : '#ffffff',
          border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
          color: isDark ? '#fafafa' : '#09090b',
        },
      }}
    />
  );
}
