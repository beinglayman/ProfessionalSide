import { api, ApiResponse } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────

export interface WalletBalance {
  subscriptionCredits: number;
  purchasedCredits: number;
  total: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'subscription_allocation' | 'purchase' | 'consumption' | 'expiry' | 'refund';
  amount: number;
  creditPool: 'subscription' | 'purchased';
  balanceAfter: number;
  featureCode: string | null;
  description: string;
  stripePaymentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CanAffordResult {
  canAfford: boolean;
  cost: number;
  balance?: number;
  featureDisplayName?: string;
  reason?: string;
}

export interface FeatureCost {
  id: string;
  featureCode: string;
  displayName: string;
  creditCost: number;
  description: string | null;
  isActive: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  monthlyCredits: number;
  stripePriceId: string | null;
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CreditProduct {
  id: string;
  name: string;
  credits: number;
  priceInCents: number;
  stripePriceId: string;
  isActive: boolean;
}

export interface CheckoutResult {
  url: string;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  featureCode?: string;
}

// ── Service ──────────────────────────────────────────────────────────

class BillingServiceClient {
  // ── Wallet ──

  async getWallet(): Promise<ApiResponse<WalletBalance>> {
    const response = await api.get<ApiResponse<WalletBalance>>('/wallet');
    return response.data;
  }

  async getTransactions(filters: TransactionFilters = {}): Promise<ApiResponse<WalletTransaction[]>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.type) params.append('type', filters.type);
    if (filters.featureCode) params.append('featureCode', filters.featureCode);

    const queryString = params.toString();
    const response = await api.get<ApiResponse<WalletTransaction[]>>(
      `/wallet/transactions${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }

  async canAfford(featureCode: string): Promise<ApiResponse<CanAffordResult>> {
    const response = await api.get<ApiResponse<CanAffordResult>>(`/wallet/can-afford/${featureCode}`);
    return response.data;
  }

  async getFeatures(): Promise<ApiResponse<FeatureCost[]>> {
    const response = await api.get<ApiResponse<FeatureCost[]>>('/wallet/features');
    return response.data;
  }

  // ── Billing ──

  async createSubscriptionCheckout(planId: string): Promise<ApiResponse<CheckoutResult>> {
    const response = await api.post<ApiResponse<CheckoutResult>>('/billing/checkout/subscription', { planId });
    return response.data;
  }

  async createTopUpCheckout(productId: string): Promise<ApiResponse<CheckoutResult>> {
    const response = await api.post<ApiResponse<CheckoutResult>>('/billing/checkout/topup', { productId });
    return response.data;
  }

  async getSubscription(): Promise<ApiResponse<UserSubscription>> {
    const response = await api.get<ApiResponse<UserSubscription>>('/billing/subscription');
    return response.data;
  }

  async getPortalUrl(): Promise<ApiResponse<{ url: string }>> {
    const response = await api.get<ApiResponse<{ url: string }>>('/billing/portal');
    return response.data;
  }

  async getProducts(): Promise<ApiResponse<CreditProduct[]>> {
    const response = await api.get<ApiResponse<CreditProduct[]>>('/billing/products');
    return response.data;
  }
}

export const billingService = new BillingServiceClient();
