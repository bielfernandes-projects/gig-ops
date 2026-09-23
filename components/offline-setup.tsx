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

  // Warms the offline cache with the user's next shows, once, so they're readable even
  // without having been opened before (e.g. mid-show with no signal).
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const res = await fetch('/api/offline-prefetch');
        if (!res.ok) return;
        const { urls } = (await res.json()) as { urls: string[] };
        if (urls.length > 0) reg.active?.postMessage({ type: 'PREFETCH', urls });
      })
      .catch(() => {});
  }, []);

  return null;
}
