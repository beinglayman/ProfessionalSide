import { prisma } from '../lib/prisma';
import { WalletService } from './wallet.service';

export class SubscriptionService {
  /**
   * Assign a plan to a user (used by payment verification + admin)
   */
  static async assignPlan(
    userId: string,
    planId: string,
    options: {
      razorpaySubscriptionId?: string;
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
        razorpaySubscriptionId: options.razorpaySubscriptionId,
        currentPeriodStart: options.currentPeriodStart,
        currentPeriodEnd: options.currentPeriodEnd,
        status: 'active',
        cancelAtPeriodEnd: false,
      },
      create: {
        userId,
        planId,
        razorpaySubscriptionId: options.razorpaySubscriptionId,
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
  static async handleRenewal(razorpaySubscriptionId: string, periodStart: Date, periodEnd: Date) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      console.error(`[SubscriptionService] No subscription found for ${razorpaySubscriptionId}`);
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
      where: { razorpaySubscriptionId },
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
  static async handleCancellation(razorpaySubscriptionId: string) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { razorpaySubscriptionId },
    });

    if (!subscription) return;

    await prisma.userSubscription.update({
      where: { razorpaySubscriptionId },
      data: { status: 'cancelled', cancelAtPeriodEnd: true },
    });
  }

  /**
   * Handle payment failure
   */
  static async handlePaymentFailure(razorpaySubscriptionId: string) {
    await prisma.userSubscription.updateMany({
      where: { razorpaySubscriptionId },
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
