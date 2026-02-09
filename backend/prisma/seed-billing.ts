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
      razorpayPlanId: null,
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
      razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID || 'plan_pro_placeholder',
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
    {
      featureCode: 'derive_story',
      displayName: 'Share As (Single Story)',
      creditCost: 1,
      description: 'Generate audience-specific story derivation',
    },
    {
      featureCode: 'derive_packet',
      displayName: 'Build Packet (Multi-Story)',
      creditCost: 2,
      description: 'Generate multi-story document',
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

  const products = [
    { name: 'small', credits: 10, priceInCents: 1000, razorpayPlanId: 'topup_small' },
    { name: 'medium', credits: 30, priceInCents: 2000, razorpayPlanId: 'topup_medium' },
    { name: 'large', credits: 50, priceInCents: 3000, razorpayPlanId: 'topup_large' },
  ];

  for (const product of products) {
    const result = await prisma.creditProduct.upsert({
      where: { razorpayPlanId: product.razorpayPlanId },
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
  console.log('   Features: 6 features (4 at 1 credit, 1 at 2 credits)');
  console.log('   Top-ups: 10 ($10), 30 ($20), 50 ($30)');
  console.log('\n⚠️  Remember to replace placeholder Razorpay Plan IDs with real ones!');
}

seedBilling()
  .catch((e) => {
    console.error('❌ Billing seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
