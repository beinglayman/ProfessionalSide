import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBilling() {
  console.log('🏦 Seeding billing data...');

  // ── Subscription Plans ─────────────────────────────────────────────

  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'free' },
    update: { displayName: 'Free', monthlyCredits: 5 },
    create: {
      name: 'free',
      displayName: 'Free',
      monthlyCredits: 5,
      stripePriceId: null,
    },
  });
  console.log(`  ✅ Free plan: ${freePlan.id} (${freePlan.monthlyCredits} credits/mo)`);

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'pro' },
    update: { displayName: 'Pro', monthlyCredits: 30 },
    create: {
      name: 'pro',
      displayName: 'Pro',
      monthlyCredits: 30,
      // Replace with your real Stripe Price ID when configured
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    },
  });
  console.log(`  ✅ Pro plan: ${proPlan.id} (${proPlan.monthlyCredits} credits/mo)`);

  // ── Feature Costs ──────────────────────────────────────────────────

  const features = [
    {
      featureCode: 'profile_export',
      displayName: 'Profile Export',
      creditCost: 1,
      description: 'Export your professional profile as a PDF document',
    },
    {
      featureCode: 'brag_document_export',
      displayName: 'Brag Document Export',
      creditCost: 1,
      description: 'Generate and export a curated career highlights document',
    },
    {
      featureCode: 'career_coaching',
      displayName: 'Career Coaching Session',
      creditCost: 1,
      description: 'AI-powered career coaching session with personalized advice',
    },
    {
      featureCode: 'career_insights',
      displayName: 'Career Insights',
      creditCost: 1,
      description: 'AI-generated insights about your career trajectory and growth areas',
    },
  ];

  for (const feature of features) {
    const result = await prisma.featureCost.upsert({
      where: { featureCode: feature.featureCode },
      update: {
        displayName: feature.displayName,
        creditCost: feature.creditCost,
        description: feature.description,
      },
      create: feature,
    });
    console.log(`  ✅ Feature: ${result.featureCode} (${result.creditCost} credit)`);
  }

  // ── Credit Products (Top-ups) ──────────────────────────────────────
  // Note: stripePriceId values are placeholders.
  // Replace with real Stripe Price IDs after creating products in Stripe Dashboard.

  const products = [
    {
      name: '10 Credits',
      credits: 10,
      priceInCents: 299,
      stripePriceId: process.env.STRIPE_TOPUP_10_PRICE_ID || 'price_topup_10_placeholder',
    },
    {
      name: '30 Credits',
      credits: 30,
      priceInCents: 699,
      stripePriceId: process.env.STRIPE_TOPUP_30_PRICE_ID || 'price_topup_30_placeholder',
    },
    {
      name: '100 Credits',
      credits: 100,
      priceInCents: 1999,
      stripePriceId: process.env.STRIPE_TOPUP_100_PRICE_ID || 'price_topup_100_placeholder',
    },
  ];

  for (const product of products) {
    const result = await prisma.creditProduct.upsert({
      where: { stripePriceId: product.stripePriceId },
      update: {
        name: product.name,
        credits: product.credits,
        priceInCents: product.priceInCents,
      },
      create: product,
    });
    console.log(`  ✅ Product: ${result.name} — ${result.credits} credits for $${(result.priceInCents / 100).toFixed(2)}`);
  }

  console.log('\n🎉 Billing seed complete!');
  console.log('   Plans: Free (5 credits/mo), Pro (30 credits/mo)');
  console.log('   Features: 4 features at 1 credit each');
  console.log('   Top-ups: 10 ($2.99), 30 ($6.99), 100 ($19.99)');
  console.log('\n⚠️  Remember to replace placeholder Stripe Price IDs with real ones!');
}

seedBilling()
  .catch((e) => {
    console.error('❌ Billing seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
