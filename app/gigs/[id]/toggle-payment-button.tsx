'use client';

import { useTransition, useOptimistic } from 'react';
import { togglePaymentStatus } from '@/app/actions/gig-actions';
import { Check } from 'lucide-react';

export function TogglePaymentButton({ 
  lineupId, 
  currentStatus,
  role
}: { 
  lineupId: string; 
  currentStatus: boolean;
  role?: string;
}) {
  const [isPending, startTransition] = useTransition();
  
  // Create an optimistic state that updates immediately in UI before server confirms
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    currentStatus,
    (state, newStatus: boolean) => newStatus
  );

  const handleToggle = () => {
    if (role === 'viewer') return;
    
    startTransition(async () => {
      // Optimistically update the UI
      setOptimisticStatus(!optimisticStatus);
      
      // Call the server action
      await togglePaymentStatus(lineupId, !optimisticStatus);
    });
  };

  const isPaid = optimisticStatus;

  return (
    <button
      onClick={handleToggle}
      disabled={isPending || role === 'viewer'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
        isPaid ? 'bg-emerald-500' : 'bg-zinc-700'
      } ${(isPending || role === 'viewer') ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-80'}`}
      role="switch"
      aria-checked={isPaid}
    >
      <span className="sr-only">Status de Pagamento</span>
      <span
        className={`inline-flex items-center justify-center size-4 transform rounded-full bg-white transition-transform ${
          isPaid ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
         {isPaid && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />}
      </span>
    </button>
  );
}
