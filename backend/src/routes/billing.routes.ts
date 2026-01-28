import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { BillingService } from '../services/billing.service';
import { sendSuccess, sendError } from '../utils/response.utils';

const router = Router();

/**
 * POST /api/v1/billing/webhook — Razorpay webhook (no auth, JSON body)
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[billing] RAZORPAY_WEBHOOK_SECRET not configured');
    sendError(res, 'Webhook not configured', 500);
    return;
  }

  try {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      sendError(res, 'Invalid webhook signature', 400);
      return;
    }

    await BillingService.handleWebhook(req.body);
    res.json({ received: true });
  } catch (error: any) {
    console.error('[billing] Webhook error:', error.message);
    sendError(res, `Webhook Error: ${error.message}`, 400);
  }
});

// All remaining routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/billing/checkout/subscription — create subscription checkout
 */
router.post('/checkout/subscription', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { planId } = req.body;
    if (!planId) {
      sendError(res, 'planId is required', 400);
      return;
    }
    const result = await BillingService.createSubscriptionCheckout(userId, planId);
    sendSuccess(res, result);
  } catch (error: any) {
    console.error('[billing] createSubscriptionCheckout error:', error);
    sendError(res, error.message || 'Failed to create checkout session', 500);
  }
});

/**
 * POST /api/v1/billing/checkout/topup — create top-up checkout
 */
router.post('/checkout/topup', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { productId } = req.body;
    if (!productId) {
      sendError(res, 'productId is required', 400);
      return;
    }
    const result = await BillingService.createTopUpCheckout(userId, productId);
    sendSuccess(res, result);
  } catch (error: any) {
    console.error('[billing] createTopUpCheckout error:', error);
    sendError(res, error.message || 'Failed to create checkout session', 500);
  }
});

/**
 * POST /api/v1/billing/verify-payment — verify Razorpay payment after checkout modal
 */
router.post('/verify-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await BillingService.verifyPayment(userId, req.body);
    sendSuccess(res, result);
  } catch (error: any) {
    console.error('[billing] verifyPayment error:', error);
    sendError(res, error.message || 'Payment verification failed', 400);
  }
});

/**
 * POST /api/v1/billing/cancel-subscription — cancel subscription
 */
router.post('/cancel-subscription', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await BillingService.cancelSubscription(userId);
    sendSuccess(res, result);
  } catch (error: any) {
    console.error('[billing] cancelSubscription error:', error);
    sendError(res, error.message || 'Failed to cancel subscription', 500);
  }
});

/**
 * GET /api/v1/billing/subscription — current subscription
 */
router.get('/subscription', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const subscription = await BillingService.getSubscription(userId);
    sendSuccess(res, subscription);
  } catch (error) {
    console.error('[billing] getSubscription error:', error);
    sendError(res, 'Failed to get subscription', 500);
  }
});

/**
 * GET /api/v1/billing/products — available top-up packages
 */
router.get('/products', async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await BillingService.getAvailableProducts();
    sendSuccess(res, products);
  } catch (error) {
    console.error('[billing] getProducts error:', error);
    sendError(res, 'Failed to get products', 500);
  }
});

export default router;
