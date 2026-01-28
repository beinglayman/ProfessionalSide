import { prisma } from '../lib/prisma';

export class WalletService {
  /**
   * Get or lazily create a wallet for a user
   */
  static async getOrCreateWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId },
      });
    }

    return wallet;
  }

  /**
   * Get current credit balance
   */
  static async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      subscriptionCredits: wallet.subscriptionCredits,
      purchasedCredits: wallet.purchasedCredits,
      total: wallet.subscriptionCredits + wallet.purchasedCredits,
    };
  }

  /**
   * Check if user can afford a feature without deducting
   */
  static async canAfford(userId: string, featureCode: string) {
    const feature = await prisma.featureCost.findUnique({
      where: { featureCode },
    });

    if (!feature || !feature.isActive) {
      return { canAfford: false, cost: 0, reason: 'Feature not found or inactive' };
    }

    const balance = await this.getBalance(userId);
    return {
      canAfford: balance.total >= feature.creditCost,
      cost: feature.creditCost,
      balance: balance.total,
      featureDisplayName: feature.displayName,
    };
  }

  /**
   * Consume credits for a feature. Subscription credits first, then purchased.
   * Uses a Prisma transaction to prevent race conditions.
   */
  static async consume(userId: string, featureCode: string) {
    const feature = await prisma.featureCost.findUnique({
      where: { featureCode },
    });

    if (!feature || !feature.isActive) {
      throw new Error(`Feature "${featureCode}" not found or inactive`);
    }

    const cost = feature.creditCost;

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const total = wallet.subscriptionCredits + wallet.purchasedCredits;
      if (total < cost) {
        throw new Error('Insufficient credits');
      }

      // Deduct subscription credits first (they expire anyway)
      let remainingCost = cost;
      let subDeducted = 0;
      let purchasedDeducted = 0;

      if (wallet.subscriptionCredits > 0) {
        subDeducted = Math.min(wallet.subscriptionCredits, remainingCost);
        remainingCost -= subDeducted;
      }

      if (remainingCost > 0) {
        purchasedDeducted = remainingCost;
      }

      // Update wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          subscriptionCredits: { decrement: subDeducted },
          purchasedCredits: { decrement: purchasedDeducted },
        },
      });

      const newTotal = updatedWallet.subscriptionCredits + updatedWallet.purchasedCredits;

      // Log transaction(s)
      const transactions = [];

      if (subDeducted > 0) {
        transactions.push(
          tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'consumption',
              amount: -subDeducted,
              creditPool: 'subscription',
              balanceAfter: newTotal + (purchasedDeducted > 0 ? purchasedDeducted : 0),
              featureCode,
              description: `Used ${subDeducted} subscription credits for ${feature.displayName}`,
            },
          })
        );
      }

      if (purchasedDeducted > 0) {
        transactions.push(
          tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'consumption',
              amount: -purchasedDeducted,
              creditPool: 'purchased',
              balanceAfter: newTotal,
              featureCode,
              description: `Used ${purchasedDeducted} purchased credits for ${feature.displayName}`,
            },
          })
        );
      }

      await Promise.all(transactions);

      return {
        success: true,
        cost,
        remainingBalance: newTotal,
        subscriptionCredits: updatedWallet.subscriptionCredits,
        purchasedCredits: updatedWallet.purchasedCredits,
      };
    });
  }

  /**
   * Add subscription credits (called on allocation/renewal)
   */
  static async addSubscriptionCredits(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);

    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: { subscriptionCredits: { increment: amount } },
    });

    const newTotal = updatedWallet.subscriptionCredits + updatedWallet.purchasedCredits;

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'subscription_allocation',
        amount,
        creditPool: 'subscription',
        balanceAfter: newTotal,
        description: `Monthly subscription credit allocation: +${amount}`,
      },
    });

    return updatedWallet;
  }

  /**
   * Add purchased credits (called on top-up)
   */
  static async addPurchasedCredits(userId: string, amount: number, razorpayPaymentId?: string) {
    const wallet = await this.getOrCreateWallet(userId);

    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: { purchasedCredits: { increment: amount } },
    });

    const newTotal = updatedWallet.subscriptionCredits + updatedWallet.purchasedCredits;

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'purchase',
        amount,
        creditPool: 'purchased',
        balanceAfter: newTotal,
        razorpayPaymentId,
        description: `Purchased ${amount} credits`,
      },
    });

    return updatedWallet;
  }

  /**
   * Expire remaining subscription credits (called at renewal)
   */
  static async expireSubscriptionCredits(userId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.subscriptionCredits === 0) return;

    const expired = wallet.subscriptionCredits;

    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: { subscriptionCredits: 0 },
    });

    const newTotal = updatedWallet.subscriptionCredits + updatedWallet.purchasedCredits;

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'expiry',
        amount: -expired,
        creditPool: 'subscription',
        balanceAfter: newTotal,
        description: `Expired ${expired} unused subscription credits at cycle end`,
      },
    });
  }

  /**
   * Get paginated transaction history
   */
  static async getTransactions(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: string;
      featureCode?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, type, featureCode } = options;
    const wallet = await this.getOrCreateWallet(userId);

    const where: any = { walletId: wallet.id };
    if (type) where.type = type;
    if (featureCode) where.featureCode = featureCode;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all active features with their costs
   */
  static async getFeatures() {
    return prisma.featureCost.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
    });
  }
}
