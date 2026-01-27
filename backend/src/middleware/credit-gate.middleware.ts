import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services/wallet.service';
import { sendError } from '../utils/response.utils';

/**
 * Middleware factory that checks if the authenticated user has enough credits
 * for a given feature. Returns 402 Payment Required if insufficient.
 */
export const requireCredits = (featureCode: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 'Authentication required', 401);
        return;
      }

      const result = await WalletService.canAfford(userId, featureCode);

      if (!result.canAfford) {
        res.status(402).json({
          success: false,
          error: 'Insufficient credits',
          data: {
            featureCode,
            cost: result.cost,
            balance: result.balance,
            featureDisplayName: result.featureDisplayName,
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[requireCredits] Error:', error);
      sendError(res, 'Error checking credit balance', 500);
    }
  };
};
