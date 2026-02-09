import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '../lib/queryClient';
import { billingService } from '../services/billing.service';
import type { WalletBalance, WalletTransaction, FeatureCost } from '../services/billing.service';

/**
 * Reactive wallet balance. Invalidate QueryKeys.walletBalance to refresh.
 */
export const useWalletBalance = () => {
  return useQuery({
    queryKey: QueryKeys.walletBalance,
    queryFn: async () => {
      const res = await billingService.getWallet();
      return res.success && res.data ? res.data.total : 0;
    },
    staleTime: 30_000, // 30s — balance changes are important
  });
};

/**
 * Full wallet breakdown (subscription + purchased).
 */
export const useWalletBreakdown = () => {
  return useQuery<WalletBalance>({
    queryKey: [...QueryKeys.walletBalance, 'breakdown'],
    queryFn: async () => {
      const res = await billingService.getWallet();
      return res.success && res.data
        ? res.data
        : { subscriptionCredits: 0, purchasedCredits: 0, total: 0 };
    },
    staleTime: 30_000,
  });
};

/**
 * Last 5 consumption transactions for the credit dropdown.
 */
export const useRecentTransactions = () => {
  return useQuery<WalletTransaction[]>({
    queryKey: [...QueryKeys.walletBalance, 'recent-transactions'],
    queryFn: async () => {
      const res = await billingService.getTransactions({ limit: 5, type: 'consumption' });
      return res.success && res.data ? res.data : [];
    },
    staleTime: 30_000,
  });
};

/**
 * Feature cost catalog (rarely changes).
 */
export const useFeatureCosts = () => {
  return useQuery<FeatureCost[]>({
    queryKey: ['feature-costs'],
    queryFn: async () => {
      const res = await billingService.getFeatures();
      return res.success && res.data ? res.data : [];
    },
    staleTime: 5 * 60_000,
  });
};
