import { stripe } from '../lib/stripe';
import { prisma } from '../lib/prisma';
import { SubscriptionService } from './subscription.service';
import { WalletService } from './wallet.service';
import Stripe from 'stripe';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export class BillingService {
  /**
   * Create a Stripe Checkout Session for a subscription
   */
  static async createSubscriptionCheckout(userId: string, planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.stripePriceId) {
      throw new Error('Plan not found or has no Stripe price');
    }

    // Get or create Stripe customer
    const customerId = await this.getOrCreateStripeCustomer(userId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/settings?tab=billing&checkout=success`,
      cancel_url: `${FRONTEND_URL}/settings?tab=billing&checkout=cancel`,
      metadata: { userId, planId },
    });

    return { url: session.url };
  }

  /**
   * Create a Stripe Checkout Session for a one-time top-up purchase
   */
  static async createTopUpCheckout(userId: string, productId: string) {
    const product = await prisma.creditProduct.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      throw new Error('Credit product not found or inactive');
    }

    const customerId = await this.getOrCreateStripeCustomer(userId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/settings?tab=billing&checkout=success`,
      cancel_url: `${FRONTEND_URL}/settings?tab=billing&checkout=cancel`,
      metadata: { userId, productId, credits: String(product.credits) },
    });

    return { url: session.url };
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          await this.handleSubscriptionCheckoutComplete(session);
        } else if (session.mode === 'payment') {
          await this.handleTopUpCheckoutComplete(session);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        // Only handle renewal invoices (not the first one which is handled by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_cycle') {
          await this.handleInvoicePaid(invoice);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;
        if (subId) {
          await SubscriptionService.handlePaymentFailure(subId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await SubscriptionService.handleCancellation(sub.id);
        break;
      }

      default:
        console.log(`[BillingService] Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Get subscription details for a user
   */
  static async getSubscription(userId: string) {
    return SubscriptionService.ensureSubscription(userId);
  }

  /**
   * Create a Stripe Customer Portal session
   */
  static async createPortalSession(userId: string) {
    const subscription = await prisma.userSubscription.findUnique({ where: { userId } });
    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this user');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${FRONTEND_URL}/settings?tab=billing`,
    });

    return { url: session.url };
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

  // ── Private helpers ───────────────────────────────────────────────

  private static async getOrCreateStripeCustomer(userId: string): Promise<string> {
    // Check existing subscription for customer ID
    const subscription = await prisma.userSubscription.findUnique({ where: { userId } });
    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    // Create new Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) throw new Error('User not found');

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId },
    });

    // Store customer ID if subscription record exists
    if (subscription) {
      await prisma.userSubscription.update({
        where: { userId },
        data: { stripeCustomerId: customer.id },
      });
    }

    return customer.id;
  }

  private static async handleSubscriptionCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    if (!userId || !planId) {
      console.error('[BillingService] Missing metadata in checkout session');
      return;
    }

    const stripeSubscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    if (!stripeSubscriptionId) return;

    // Get subscription details from Stripe for period dates
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    await SubscriptionService.assignPlan(userId, planId, {
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSubscriptionId,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    });
  }

  private static async handleTopUpCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '0', 10);
    if (!userId || credits <= 0) {
      console.error('[BillingService] Missing metadata in top-up checkout');
      return;
    }

    await WalletService.addPurchasedCredits(
      userId,
      credits,
      session.payment_intent as string | undefined
    );
  }

  private static async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
    if (!subId) return;

    const stripeSub = await stripe.subscriptions.retrieve(subId);

    await SubscriptionService.handleRenewal(
      subId,
      new Date(stripeSub.current_period_start * 1000),
      new Date(stripeSub.current_period_end * 1000)
    );
  }

  private static async handleSubscriptionUpdated(sub: Stripe.Subscription) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
    });

    if (!subscription) return;

    await prisma.userSubscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : subscription.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });
  }
}
