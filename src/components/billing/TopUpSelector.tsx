import React, { useState } from 'react';
import { Coins, Loader2, Plus } from 'lucide-react';
import { billingService, CreditProduct } from '../../services/billing.service';
import { Button } from '../ui/button';

interface TopUpSelectorProps {
  products: CreditProduct[];
}

export function TopUpSelector({ products }: TopUpSelectorProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleBuy = async (productId: string) => {
    setLoadingId(productId);
    try {
      const res = await billingService.createTopUpCheckout(productId);
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Top-up checkout error:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (products.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Buy Credits</h3>
      <p className="text-sm text-gray-500 mb-4">Purchased credits never expire.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Coins className="h-5 w-5 text-amber-500" />
              <span className="text-lg font-semibold text-gray-900">{product.credits}</span>
              <span className="text-sm text-gray-500">credits</span>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-3">{formatPrice(product.priceInCents)}</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleBuy(product.id)}
              disabled={loadingId === product.id}
            >
              {loadingId === product.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Buy
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
