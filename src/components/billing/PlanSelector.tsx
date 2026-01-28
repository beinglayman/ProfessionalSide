import React, { useState } from 'react';
import { Check, Crown, Loader2 } from 'lucide-react';
import { useRazorpay } from 'react-razorpay';
import { billingService, UserSubscription, SubscriptionPlan } from '../../services/billing.service';
import { Button } from '../ui/button';

interface PlanSelectorProps {
  subscription: UserSubscription | null;
  plans: SubscriptionPlan[];
  onSubscriptionChange?: () => void;
}

export function PlanSelector({ subscription, plans, onSubscriptionChange }: PlanSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { Razorpay } = useRazorpay();

  const currentPlanName = subscription?.plan?.name || 'free';

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      const res = await billingService.createSubscriptionCheckout(planId);
      if (!res.success || !res.data) return;

      const { subscriptionId, keyId, userName, userEmail, planName } = res.data;

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'InChronicle',
        description: `${planName} Plan Subscription`,
        prefill: { name: userName, email: userEmail },
        handler: async (response: any) => {
          try {
            await billingService.verifyPayment({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              type: 'subscription',
              planId,
            });
            onSubscriptionChange?.();
          } catch (err) {
            console.error('Payment verification failed:', err);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.')) return;
    setCancelLoading(true);
    try {
      await billingService.cancelSubscription();
      onSubscriptionChange?.();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Plan</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlanName;
          const isFree = plan.name === 'free';

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border-2 p-5 transition-all ${
                isCurrent
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 left-4 bg-primary-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  Current
                </span>
              )}
              <div className="flex items-center space-x-2 mb-2">
                {!isFree && <Crown className="h-5 w-5 text-amber-500" />}
                <h4 className="text-lg font-semibold text-gray-900">{plan.displayName}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {plan.monthlyCredits > 0
                  ? `${plan.monthlyCredits} credits/month`
                  : 'Basic access'}
              </p>
              <ul className="space-y-1.5 mb-4">
                {isFree ? (
                  <>
                    <li className="flex items-center text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Core features
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Limited access
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {plan.monthlyCredits} monthly credits
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      All premium features
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Priority support
                    </li>
                  </>
                )}
              </ul>
              {isCurrent ? (
                !isFree ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleCancel}
                    disabled={cancelLoading || subscription?.cancelAtPeriodEnd}
                  >
                    {cancelLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : subscription?.cancelAtPeriodEnd ? (
                      'Cancelling at period end'
                    ) : (
                      'Cancel Subscription'
                    )}
                  </Button>
                ) : null
              ) : (
                !isFree && (
                  <Button size="sm" className="w-full" onClick={() => handleUpgrade(plan.id)} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade'}
                  </Button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
