'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

const FORCED_DARK_ROUTES = ['/', '/login', '/onboarding', '/termos', '/privacidade'];

export function ThemeToaster() {
  const pathname = usePathname();
  const forcedDark = FORCED_DARK_ROUTES.includes(pathname) || pathname.startsWith('/auth');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Client-side navigations don't re-run the <head> FOUC script, so keep the
  // <html> class in sync with forcedDark across route changes too.
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const shouldBeDark = forcedDark || saved !== 'light';
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, [forcedDark, pathname]);

  useEffect(() => {
    if (forcedDark) return;

    const saved = localStorage.getItem('theme');
    if (saved === 'light') setTheme('light');
    else if (saved === 'dark') setTheme('dark');
    else setTheme('dark');

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        setTheme(e.newValue === 'light' ? 'light' : 'dark');
      }
    };
    window.addEventListener('storage', onStorage);

    // Also listen for class changes on <html> as a fallback
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('storage', onStorage);
      observer.disconnect();
    };
  }, [forcedDark]);

  const effectiveTheme = forcedDark ? 'dark' : theme;
  const isDark = effectiveTheme === 'dark';

  return (
    <Toaster
      theme={effectiveTheme}
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
