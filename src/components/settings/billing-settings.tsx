import React, { useEffect, useState, useCallback } from 'react';
import { Coins, CreditCard, Loader2 } from 'lucide-react';
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

export default function BillingSettings() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, subRes, productsRes] = await Promise.all([
        billingService.getWallet(),
        billingService.getSubscription(),
        billingService.getProducts(),
      ]);

      if (walletRes.success && walletRes.data) setBalance(walletRes.data);
      if (subRes.success && subRes.data) {
        setSubscription(subRes.data);
        const subPlan = subRes.data.plan;
        const freePlan: SubscriptionPlan = {
          id: 'free',
          name: 'free',
          displayName: 'Free',
          monthlyCredits: 0,
          razorpayPlanId: null,
          isActive: true,
        };
        if (subPlan.name === 'free') {
          setPlans([freePlan, {
            id: 'pro-placeholder',
            name: 'pro',
            displayName: 'Pro',
            monthlyCredits: 500,
            razorpayPlanId: 'placeholder',
            isActive: true,
          }]);
        } else {
          setPlans([freePlan, subPlan]);
        }
      }
      if (productsRes.success && productsRes.data) setProducts(productsRes.data);
    } catch (err) {
      console.error('Billing data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <p className="mt-1 text-gray-600">Manage your subscription and credits.</p>
      </div>

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
        <PlanSelector subscription={subscription} plans={plans} onSubscriptionChange={fetchData} />
      </div>

      {/* Top-Up Credits */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <TopUpSelector products={products} onPurchaseComplete={fetchData} />
      </div>

      {/* Transaction History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <TransactionHistory />
      </div>
    </div>
  );
}
