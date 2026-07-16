'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';

export function ThemeToaster() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') setTheme('light');
    else if (saved === 'dark') setTheme('dark');
    else setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

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
  }, []);

  const isDark = theme === 'dark';

  return (
    <Toaster
      theme={theme}
      position="bottom-center"
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
