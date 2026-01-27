import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { billingService } from '../../services/billing.service';
import { Link } from 'react-router-dom';

export function CreditBadge() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    billingService.getWallet().then((res) => {
      if (mounted && res.success && res.data) {
        setTotal(res.data.total);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (total === null) return null;

  return (
    <Link
      to="/settings?tab=billing"
      className="flex items-center space-x-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
      title="Credit balance"
    >
      <Coins className="h-4 w-4" />
      <span>{total}</span>
    </Link>
  );
}
