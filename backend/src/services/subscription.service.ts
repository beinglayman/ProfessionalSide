import { prisma } from '../lib/prisma';
import { WalletService } from './wallet.service';

export class SubscriptionService {
  /**
   * Assign a plan to a user (used by webhook + admin)
   */
  static async assignPlan(
    userId: string,
    planId: string,
    options: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
    } = {}
  ) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error(`Plan "${planId}" not found`);

    const subscription = await prisma.userSubscription.upsert({
      where: { userId },
      update: {
        planId,
        stripeCustomerId: options.stripeCustomerId,
        stripeSubscriptionId: options.stripeSubscriptionId,
        currentPeriodStart: options.currentPeriodStart,
        currentPeriodEnd: options.currentPeriodEnd,
        status: 'active',
        cancelAtPeriodEnd: false,
      },
      create: {
        userId,
        planId,
        stripeCustomerId: options.stripeCustomerId,
        stripeSubscriptionId: options.stripeSubscriptionId,
        currentPeriodStart: options.currentPeriodStart,
        currentPeriodEnd: options.currentPeriodEnd,
        status: 'active',
      },
    });

    // Allocate monthly credits if plan has them
    if (plan.monthlyCredits > 0) {
      await WalletService.addSubscriptionCredits(userId, plan.monthlyCredits);
    }

    return subscription;
  }

  /**
   * Handle subscription renewal — expire old credits, allocate new
   */
  static async handleRenewal(stripeSubscriptionId: string, periodStart: Date, periodEnd: Date) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      console.error(`[SubscriptionService] No subscription found for ${stripeSubscriptionId}`);
      return;
    }

    // Expire remaining subscription credits from previous cycle
    await WalletService.expireSubscriptionCredits(subscription.userId);

    // Allocate fresh credits
    if (subscription.plan.monthlyCredits > 0) {
      await WalletService.addSubscriptionCredits(subscription.userId, subscription.plan.monthlyCredits);
    }

    // Update period dates
    await prisma.userSubscription.update({
      where: { stripeSubscriptionId },
      data: {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: 'active',
      },
    });
  }

  /**
   * Handle cancellation
   */
  static async handleCancellation(stripeSubscriptionId: string) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (!subscription) return;

    await prisma.userSubscription.update({
      where: { stripeSubscriptionId },
      data: { status: 'cancelled', cancelAtPeriodEnd: true },
    });

    // Note: subscription credits remain until period end.
    // They'll be expired on the next renewal attempt (which won't happen)
    // or can be expired via a cron if needed.
  }

  /**
   * Handle payment failure
   */
  static async handlePaymentFailure(stripeSubscriptionId: string) {
    await prisma.userSubscription.updateMany({
      where: { stripeSubscriptionId },
      data: { status: 'past_due' },
    });
  }

  /**
   * Get current subscription for a user
   */
  static async getSubscription(userId: string) {
    return prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  }

  /**
   * Get or create a free-tier subscription for a user
   */
  static async ensureSubscription(userId: string) {
    let subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      // Find or create the free plan
      let freePlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'free' } });
      if (!freePlan) {
        freePlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'free',
            displayName: 'Free',
            monthlyCredits: 0,
          },
        });
      }

      subscription = await prisma.userSubscription.create({
        data: { userId, planId: freePlan.id, status: 'active' },
        include: { plan: true },
      });
    }

    return subscription;
  }
}
