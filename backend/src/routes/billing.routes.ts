import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { BillingService } from '../services/billing.service';
import { sendSuccess, sendError } from '../utils/response.utils';
import { stripe } from '../lib/stripe';

const router = Router();

/**
 * POST /api/v1/billing/webhook — Stripe webhook (no auth, raw body)
 * IMPORTANT: This route must be registered BEFORE express.json() body parsing,
 * or use express.raw() specifically. Handled in app.ts.
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[billing] STRIPE_WEBHOOK_SECRET not configured');
    sendError(res, 'Webhook not configured', 500);
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    await BillingService.handleWebhook(event);
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
 * GET /api/v1/billing/portal — Stripe customer portal URL
 */
router.get('/portal', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await BillingService.createPortalSession(userId);
    sendSuccess(res, result);
  } catch (error: any) {
    console.error('[billing] createPortalSession error:', error);
    sendError(res, error.message || 'Failed to create portal session', 500);
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
