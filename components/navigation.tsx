'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { CalendarDays, FolderOpen, Users, UserRound, LayoutDashboard, BarChart3, Music, LogOut } from 'lucide-react';
import { signout } from '@/app/login/actions';

export const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agenda', href: '/agenda', icon: CalendarDays },
  { name: 'Projetos', href: '/projects', icon: FolderOpen },
  { name: 'Músicos', href: '/members', icon: Users },
  { name: 'Repertório', href: '/repertorio', icon: Music },
  { name: 'Relatório', href: '/relatorio', icon: BarChart3 },
  { name: 'Perfil', href: '/profile', icon: UserRound },
];

export const HIDE_NAV_PATHS = ['/', '/login', '/onboarding', '/termos', '/privacidade'];
export const hideNav = (pathname: string) => HIDE_NAV_PATHS.includes(pathname) || pathname.startsWith('/auth') || pathname.startsWith('/palco') || pathname.startsWith('/s/');

/** Desktop sidebar. The phone layout lives in MobileNav. */
export function Navigation() {
  const pathname = usePathname();

  if (hideNav(pathname)) return null;

  // Desktop Component
  return (
    <div className="flex flex-col w-full h-full">
      <div className="p-6">
        <Logo className="h-auto w-40" priority />
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              data-tour-nav={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800/80 text-zinc-100 rounded-lg'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <form action={signout} className="px-4 pb-6">
        <button
          type="submit"
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </form>
    </div>
  );
}
