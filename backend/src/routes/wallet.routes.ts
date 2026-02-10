import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { WalletService } from '../services/wallet.service';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.utils';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/wallet — current balance
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const balance = await WalletService.getBalance(userId);
    sendSuccess(res, balance);
  } catch (error) {
    console.error('[wallet] getBalance error:', error);
    sendError(res, 'Failed to get wallet balance', 500);
  }
});

/**
 * GET /api/v1/wallet/transactions — paginated history
 */
router.get('/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as string | undefined;
    const featureCode = req.query.featureCode as string | undefined;

    const result = await WalletService.getTransactions(userId, { page, limit, type, featureCode });
    sendPaginated(res, result.transactions, result.pagination);
  } catch (error) {
    console.error('[wallet] getTransactions error:', error);
    sendError(res, 'Failed to get transactions', 500);
  }
});

/**
 * GET /api/v1/wallet/can-afford/:featureCode — affordability check
 */
router.get('/can-afford/:featureCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { featureCode } = req.params;
    const result = await WalletService.canAfford(userId, featureCode);
    sendSuccess(res, result);
  } catch (error) {
    console.error('[wallet] canAfford error:', error);
    sendError(res, 'Failed to check affordability', 500);
  }
});

/**
 * GET /api/v1/wallet/features — list features with costs
 */
router.get('/features', async (_req: Request, res: Response): Promise<void> => {
  try {
    const features = await WalletService.getFeatures();
    sendSuccess(res, features);
  } catch (error) {
    console.error('[wallet] getFeatures error:', error);
    sendError(res, 'Failed to get features', 500);
  }
});

/**
 * POST /api/v1/wallet/add-credits — admin: add purchased credits to a user by email
 * Body: { email: string, amount: number }
 */
router.post('/add-credits', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, amount } = req.body;
    if (!email || !amount || typeof amount !== 'number' || amount <= 0) {
      sendError(res, 'email (string) and amount (positive number) required', 400);
      return;
    }

    const target = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!target) {
      sendError(res, `User ${email} not found`, 404);
      return;
    }

    await WalletService.addPurchasedCredits(target.id, amount);
    const balance = await WalletService.getBalance(target.id);
    sendSuccess(res, { email, creditsAdded: amount, balance });
  } catch (error) {
    console.error('[wallet] addCredits error:', error);
    sendError(res, 'Failed to add credits', 500);
  }
});

export default router;
