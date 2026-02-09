import React, { useEffect, useRef } from 'react';
import { Coins, ArrowRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWalletBalance, useWalletBreakdown, useRecentTransactions } from '../../hooks/useBilling';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function CreditBadge() {
  const { data: total } = useWalletBalance();
  const { data: breakdown } = useWalletBreakdown();
  const { data: recentTxns = [] } = useRecentTransactions();
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center space-x-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
          title="Credit balance"
        >
          <Coins className="h-4 w-4" />
          <span ref={badgeRef}>{total}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Balance header */}
        <DropdownMenuLabel className="pb-0">
          <span className="text-base font-bold">{total} credits</span>
        </DropdownMenuLabel>
        {breakdown && (
          <div className="px-2 pb-1.5 text-xs text-gray-500">
            {breakdown.subscriptionCredits} subscription · {breakdown.purchasedCredits} purchased
          </div>
        )}

        <DropdownMenuSeparator />

        {/* Recent spending */}
        <DropdownMenuLabel className="text-xs text-gray-400 font-normal">
          Recent spending
        </DropdownMenuLabel>
        {recentTxns.length === 0 ? (
          <div className="px-2 py-2 text-xs text-gray-400 italic">No recent spending</div>
        ) : (
          recentTxns.map((txn) => (
            <div key={txn.id} className="flex items-center justify-between px-2 py-1.5 text-sm">
              <span className="text-gray-700 truncate mr-2">{txn.description}</span>
              <span className="flex items-center gap-1.5 text-xs shrink-0">
                <span className="text-red-600 font-medium">{txn.amount}</span>
                <span className="text-gray-400">{formatRelativeTime(txn.createdAt)}</span>
              </span>
            </div>
          ))
        )}

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem asChild>
          <Link to="/settings?tab=billing" className="flex items-center gap-2 cursor-pointer">
            <ArrowRight className="h-3.5 w-3.5" />
            View all transactions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings?tab=billing" className="flex items-center gap-2 cursor-pointer">
            <ShoppingCart className="h-3.5 w-3.5" />
            Buy credits
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
