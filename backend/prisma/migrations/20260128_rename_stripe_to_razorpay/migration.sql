-- Rename Stripe fields to Razorpay equivalents

-- SubscriptionPlan: stripePriceId → razorpayPlanId
ALTER TABLE "subscription_plans" RENAME COLUMN "stripePriceId" TO "razorpayPlanId";

-- UserSubscription: drop stripeCustomerId, rename stripeSubscriptionId → razorpaySubscriptionId
ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "stripeCustomerId";
DROP INDEX IF EXISTS "user_subscriptions_stripeCustomerId_idx";
ALTER TABLE "user_subscriptions" RENAME COLUMN "stripeSubscriptionId" TO "razorpaySubscriptionId";

-- WalletTransaction: stripePaymentId → razorpayPaymentId
ALTER TABLE "wallet_transactions" RENAME COLUMN "stripePaymentId" TO "razorpayPaymentId";

-- CreditProduct: stripePriceId → razorpayPlanId
ALTER TABLE "credit_products" RENAME COLUMN "stripePriceId" TO "razorpayPlanId";
