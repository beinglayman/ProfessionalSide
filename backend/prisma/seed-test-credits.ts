import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CREDIT_AMOUNT = 60;
const TARGET_EMAILS = ['yc@inchronicle.com', 'ketan@inchronicle.com'];

async function seedTestCredits() {
  console.log(`Seeding ${CREDIT_AMOUNT} purchased credits to target accounts...`);

  for (const email of TARGET_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log(`  SKIP ${email}: user not found`);
      continue;
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: user.id, subscriptionCredits: 0, purchasedCredits: 0 },
      });
    }

    // Add purchased credits + log transaction
    const newBalance = wallet.purchasedCredits + CREDIT_AMOUNT;
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { purchasedCredits: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'purchase',
          amount: CREDIT_AMOUNT,
          creditPool: 'purchased',
          balanceAfter: wallet.subscriptionCredits + newBalance,
          description: `Manual credit allocation (${CREDIT_AMOUNT} credits)`,
        },
      }),
    ]);

    console.log(`  ${email}: +${CREDIT_AMOUNT} credits (total purchased: ${newBalance})`);
  }

  console.log('\nDone!');
}

seedTestCredits()
  .catch((e) => {
    console.error('Test credit seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
