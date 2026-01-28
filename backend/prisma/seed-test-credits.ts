import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestCredits() {
  console.log('🧪 Seeding 30 test credits to all existing accounts...');

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`  Found ${users.length} users`);

  let credited = 0;
  for (const user of users) {
    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: user.id, subscriptionCredits: 0, purchasedCredits: 0 },
      });
    }

    // Add 30 purchased credits + log transaction
    const newBalance = wallet.purchasedCredits + 30;
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { purchasedCredits: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'purchase',
          amount: 30,
          creditPool: 'purchased',
          balanceAfter: wallet.subscriptionCredits + newBalance,
          description: 'Test credit allocation',
        },
      }),
    ]);

    credited++;
    console.log(`  ✅ ${user.email}: +30 credits (total purchased: ${newBalance})`);
  }

  console.log(`\n🎉 Done! Credited ${credited} accounts with 30 purchased credits each.`);
}

seedTestCredits()
  .catch((e) => {
    console.error('❌ Test credit seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
