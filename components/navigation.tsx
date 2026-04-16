'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, FolderOpen, Users, Settings } from 'lucide-react';

const navItems = [
  { name: 'Gigs', href: '/', icon: CalendarDays },
  { name: 'Projetos', href: '/projects', icon: FolderOpen },
  { name: 'Músicos', href: '/members', icon: Users },
  { name: 'Ajustes', href: '/settings', icon: Settings },
];

export function Navigation({ isMobile }: { isMobile: boolean }) {
  const pathname = usePathname();

  if (isMobile) {
    return (
      <nav className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-2' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Desktop Component
  return (
    <div className="flex flex-col w-full h-full">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">Minha Banda</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
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
    </div>
  );
}
