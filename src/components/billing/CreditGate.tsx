import React, { useEffect, useState } from 'react';
import { Lock, Coins, ArrowRight } from 'lucide-react';
import { billingService, CanAffordResult } from '../../services/billing.service';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';

interface CreditGateProps {
  featureCode: string;
  children: React.ReactNode;
  /** If true, consume credits when the component mounts (use for one-shot actions) */
  consumeOnMount?: boolean;
}

/**
 * Wraps premium features. Renders children if the user can afford the feature,
 * otherwise shows an upgrade/buy prompt.
 */
export function CreditGate({ featureCode, children, consumeOnMount = false }: CreditGateProps) {
  const [result, setResult] = useState<CanAffordResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    billingService.canAfford(featureCode).then((res) => {
      if (mounted && res.success && res.data) {
        setResult(res.data);
      }
    }).catch(() => {
      if (mounted) setResult({ canAfford: false, cost: 0, reason: 'Failed to check' });
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [featureCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (result?.canAfford) {
    return <>{children}</>;
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
        <Lock className="h-6 w-6 text-amber-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
      <p className="text-sm text-gray-600 mb-1">
        {result?.featureDisplayName || 'This feature'} requires{' '}
        <span className="font-semibold">{result?.cost ?? '?'} credits</span>.
      </p>
      {result?.balance !== undefined && (
        <p className="text-sm text-gray-500 mb-4">
          Your balance: <span className="font-medium">{result.balance} credits</span>
        </p>
      )}
      <div className="flex items-center justify-center space-x-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/settings?tab=billing" className="flex items-center space-x-1">
            <Coins className="h-4 w-4" />
            <span>Buy Credits</span>
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/settings?tab=billing" className="flex items-center space-x-1">
            <span>Upgrade Plan</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
