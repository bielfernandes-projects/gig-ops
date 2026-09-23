'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { navItems, hideNav } from '@/components/navigation';
import { signout } from '@/app/login/actions';

export const NAV_EVENT = 'gg:nav';

/** Phone layout: top bar (menu on the left, sign out on the right) with a slide-in drawer. */
export function MobileNav() {
  const pathname = usePathname();
  const hidden = hideNav(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('has-mobile-nav', !hidden);
    return () => document.documentElement.classList.remove('has-mobile-nav');
  }, [hidden]);

  // The onboarding tour opens/closes the drawer to point at its items.
  useEffect(() => {
    const onNav = (e: Event) => setOpen(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(NAV_EVENT, onNav);
    return () => window.removeEventListener(NAV_EVENT, onNav);
  }, []);

  if (hidden) return null;

  return (
    <div className="mobile-nav md:hidden print:!hidden">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 px-3 pt-safe backdrop-blur-md">
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" data-tour-menu className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-900">
          <Menu className="h-6 w-6" />
        </button>
        <Logo className="h-auto w-24" />
        <form action={signout}>
          <button type="submit" aria-label="Sair" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-red-400">
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </header>

      <div
        className={`fixed inset-0 z-[60] bg-black/70 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[61] flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 pt-safe pb-safe transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Menu"
      >
        <div className="flex items-center justify-between p-4">
          <Logo className="h-auto w-32" />
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                data-tour-nav={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${active ? 'bg-zinc-800/80 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'}`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between p-4">
          <form action={signout}>
            <button type="submit" aria-label="Sair" className="rounded-full border border-zinc-700 bg-zinc-800 p-2.5 text-zinc-300 hover:bg-zinc-700 hover:text-red-400">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
          <ThemeToggle />
        </div>
      </aside>
    </div>
  );
}
