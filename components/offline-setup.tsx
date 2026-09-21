'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Registers the service worker (offline read of visited pages) and wipes the cache on the login page (sign-out / shared devices). */
export function OfflineSetup() {
  const pathname = usePathname();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (pathname === '/login') {
      if ('caches' in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [pathname]);

  return null;
}
