import React, { useEffect, useRef } from 'react';
import { Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWalletBalance } from '../../hooks/useBilling';
import { cn } from '../../lib/utils';

export function CreditBadge() {
  const { data: total } = useWalletBalance();
  const prevTotal = useRef<number | null>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  // Flash animation when balance changes (not on initial load)
  useEffect(() => {
    if (total === undefined) return;
    if (prevTotal.current !== null && prevTotal.current !== total) {
      badgeRef.current?.animate(
        [
          { transform: 'scale(1.3)', color: prevTotal.current > total ? '#dc2626' : '#16a34a' },
          { transform: 'scale(1)', color: '' },
        ],
        { duration: 400, easing: 'ease-out' }
      );
    }
    prevTotal.current = total;
  }, [total]);

  if (total === undefined) return null;

  return (
    <Link
      to="/settings?tab=billing"
      className="flex items-center space-x-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
      title="Credit balance"
    >
      <Coins className="h-4 w-4" />
      <span ref={badgeRef}>{total}</span>
    </Link>
  );
}
