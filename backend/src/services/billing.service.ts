import crypto from 'crypto';
import { razorpay, RAZORPAY_KEY_ID } from '../lib/razorpay';
import { prisma } from '../lib/prisma';
import { SubscriptionService } from './subscription.service';
import { WalletService } from './wallet.service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function requireRazorpay() {
  if (!razorpay) throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  return razorpay;
}

export class BillingService {
  /**
   * Create a Razorpay Subscription for upgrading to a paid plan
   */
  static async createSubscriptionCheckout(userId: string, planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.razorpayPlanId) {
      throw new Error('Plan not found or has no Razorpay plan ID');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) throw new Error('User not found');

    const rz = requireRazorpay();
    const subscription = await rz.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      total_count: 12, // 12 billing cycles
      notes: { userId, planId },
    });

    return {
      subscriptionId: subscription.id,
      keyId: RAZORPAY_KEY_ID,
      userName: user.name,
      userEmail: user.email,
      planName: plan.displayName,
    };
  }

  /**
   * Create a Razorpay Order for a one-time top-up purchase
   */
  static async createTopUpCheckout(userId: string, productId: string) {
    const product = await prisma.creditProduct.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      throw new Error('Credit product not found or inactive');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) throw new Error('User not found');

    const rz = requireRazorpay();
    const order = await rz.orders.create({
      amount: product.priceInCents, // Razorpay uses smallest currency unit (cents for USD)
      currency: 'USD',
      receipt: `topup_${userId}_${Date.now()}`,
      notes: { userId, productId, credits: String(product.credits) },
    });

    return {
      orderId: order.id,
      amount: product.priceInCents,
      currency: 'USD',
      keyId: RAZORPAY_KEY_ID,
      userName: user.name,
      userEmail: user.email,
      productName: product.name,
      credits: product.credits,
    };
  }

  /**
   * Verify Razorpay payment signature after frontend checkout
   */
  static async verifyPayment(
    userId: string,
    data: {
      razorpay_order_id?: string;
      razorpay_subscription_id?: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      type: 'subscription' | 'topup';
      planId?: string;
      productId?: string;
    }
  ) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error('Razorpay key secret not configured');

    // Verify signature
    let payload: string;
    if (data.type === 'subscription') {
      payload = `${data.razorpay_payment_id}|${data.razorpay_subscription_id}`;
    } else {
      payload = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== data.razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    // Process based on type
    if (data.type === 'subscription' && data.planId && data.razorpay_subscription_id) {
      await SubscriptionService.assignPlan(userId, data.planId, {
        razorpaySubscriptionId: data.razorpay_subscription_id,
      });
      return { success: true, message: 'Subscription activated' };
    } else if (data.type === 'topup' && data.productId) {
      const product = await prisma.creditProduct.findUnique({ where: { id: data.productId } });
      if (!product) throw new Error('Product not found');

      await WalletService.addPurchasedCredits(
        userId,
        product.credits,
        data.razorpay_payment_id
      );
      return { success: true, message: `${product.credits} credits added` };
    }

    throw new Error('Invalid verification data');
  }

  /**
   * Handle Razorpay webhook events
   */
  static async handleWebhook(body: any) {
    const event = body.event;
    const payload = body.payload;

    switch (event) {
      case 'subscription.activated': {
        // Subscription is now active — credits already allocated via verify-payment
        console.log('[BillingService] Subscription activated via webhook');
        break;
      }

      case 'subscription.charged': {
        // Recurring charge — allocate new cycle credits
        const subEntity = payload?.subscription?.entity;
        if (subEntity?.id) {
          const subscription = await prisma.userSubscription.findUnique({
            where: { razorpaySubscriptionId: subEntity.id },
          });
          if (subscription) {
            await SubscriptionService.handleRenewal(
              subEntity.id,
              new Date(),
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // ~30 days
            );
          }
        }
        break;
      }

      case 'subscription.cancelled': {
        const subEntity = payload?.subscription?.entity;
        if (subEntity?.id) {
          await SubscriptionService.handleCancellation(subEntity.id);
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload?.payment?.entity;
        const subId = paymentEntity?.subscription_id;
        if (subId) {
          await SubscriptionService.handlePaymentFailure(subId);
        }
        break;
      }

      default:
        console.log(`[BillingService] Unhandled webhook event: ${event}`);
    }
  }

  /**
   * Cancel a user's subscription
   */
  static async cancelSubscription(userId: string) {
    const subscription = await prisma.userSubscription.findUnique({ where: { userId } });
    if (!subscription?.razorpaySubscriptionId) {
      throw new Error('No active Razorpay subscription found');
    }

    const rz = requireRazorpay();
    await rz.subscriptions.cancel(subscription.razorpaySubscriptionId, false); // cancel at end of period

    await prisma.userSubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });

    return { success: true, message: 'Subscription will be cancelled at end of billing period' };
  }

  /**
   * Get subscription details for a user
   */
  static async getSubscription(userId: string) {
    return SubscriptionService.ensureSubscription(userId);
  }

  /**
   * Get available top-up credit products
   */
  static async getAvailableProducts() {
    return prisma.creditProduct.findMany({
      where: { isActive: true },
      orderBy: { credits: 'asc' },
    });
  }
}
