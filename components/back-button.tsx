'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export function BackButton({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();

  return (
    <button onClick={() => router.back()} className={className}>
      {children}
    </button>
  );
}