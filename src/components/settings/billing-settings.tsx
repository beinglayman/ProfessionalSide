import React, { useEffect, useState } from 'react';
import { Coins, CreditCard, Loader2, CheckCircle, XCircle } from 'lucide-react';
import {
  billingService,
  WalletBalance,
  UserSubscription,
  CreditProduct,
  SubscriptionPlan,
} from '../../services/billing.service';
import { PlanSelector } from '../billing/PlanSelector';
import { TopUpSelector } from '../billing/TopUpSelector';
import { TransactionHistory } from '../billing/TransactionHistory';
import { useSearchParams } from 'react-router-dom';

export default function BillingSettings() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const checkoutStatus = searchParams.get('checkout');

  useEffect(() => {
    Promise.all([
      billingService.getWallet(),
      billingService.getSubscription(),
      billingService.getProducts(),
    ])
      .then(([walletRes, subRes, productsRes]) => {
        if (walletRes.success && walletRes.data) setBalance(walletRes.data);
        if (subRes.success && subRes.data) {
          setSubscription(subRes.data);
          // Build plan list from subscription data
          // We always have the free plan + the subscription's plan if different
          const subPlan = subRes.data.plan;
          const freePlan: SubscriptionPlan = {
            id: 'free',
            name: 'free',
            displayName: 'Free',
            monthlyCredits: 0,
            stripePriceId: null,
            isActive: true,
          };
          if (subPlan.name === 'free') {
            // Try to show a Pro plan placeholder if we know about it
            setPlans([freePlan, ...(subPlan.name !== 'pro' ? [{
              id: 'pro-placeholder',
              name: 'pro',
              displayName: 'Pro',
              monthlyCredits: 500,
              stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'placeholder',
              isActive: true,
            }] : [])]);
          } else {
            setPlans([freePlan, subPlan]);
          }
        }
        if (productsRes.success && productsRes.data) setProducts(productsRes.data);
      })
      .catch((err) => console.error('Billing data fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Billing & Credits</h2>
        <p className="mt-1 text-gray-600">Manage your subscription, credits, and payment methods.</p>
      </div>

      {/* Checkout status banner */}
      {checkoutStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">Payment successful! Your credits have been updated.</p>
        </div>
      )}
      {checkoutStatus === 'cancel' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center space-x-3">
          <XCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">Checkout was cancelled. No charges were made.</p>
        </div>
      )}

      {/* Credit Balance Card */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Coins className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Credit Balance</h3>
            <p className="text-sm text-gray-600">Use credits to access premium features</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{balance?.total ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Subscription</p>
            <p className="text-2xl font-bold text-blue-600">{balance?.subscriptionCredits ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">Resets monthly</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Purchased</p>
            <p className="text-2xl font-bold text-green-600">{balance?.purchasedCredits ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">Never expires</p>
          </div>
        </div>

        {/* Subscription status */}
        {subscription && subscription.plan.name !== 'free' && subscription.currentPeriodEnd && (
          <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
            <CreditCard className="h-4 w-4" />
            <span>
              {subscription.cancelAtPeriodEnd ? 'Subscription ends' : 'Subscription credits reset'} on{' '}
              <span className="font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Plan Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <PlanSelector subscription={subscription} plans={plans} />
      </div>

      {/* Top-Up Credits */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <TopUpSelector products={products} />
      </div>

      {/* Transaction History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <TransactionHistory />
      </div>
    </div>
  );
}
