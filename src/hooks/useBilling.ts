import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '../lib/queryClient';
import { billingService } from '../services/billing.service';

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
