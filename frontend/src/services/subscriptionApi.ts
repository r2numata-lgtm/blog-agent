/**
 * サブスクリプションAPI
 */
import api from './api';

// 型定義
export interface SubscriptionStatus {
  plan_type: string;
  subscription_status: string;
  effective_plan: string;
  article_count: number;
  article_limit: number;
  decoration_count: number;
  decoration_limit: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  scheduled_plan_type: string | null;
  scheduled_change_at: string | null;
}

export interface SubscriptionUsage {
  article_used: number;
  article_limit: number;
  article_remaining: number;
  article_percentage: number;
  decoration_used: number;
  decoration_limit: number;
  reset_date: string | null;
  is_trial: boolean;
}

interface CheckoutSessionResponse {
  checkout_session_id: string;
  url: string;
}

interface PortalSessionResponse {
  url: string;
}

// API関数
export const subscriptionApi = {
  getStatus: () => api.get<SubscriptionStatus>('/api/subscription/status'),

  getUsage: () => api.get<SubscriptionUsage>('/api/subscription/usage'),

  createCheckoutSession: (params: {
    price_id: string;
    success_url: string;
    cancel_url: string;
    trial?: boolean;
  }) => api.post<CheckoutSessionResponse>('/api/stripe/create-checkout-session', params),

  createPortalSession: (params: { return_url: string }) =>
    api.post<PortalSessionResponse>('/api/stripe/create-portal-session', params),

  changePlan: (params: { price_id: string; immediate?: boolean; end_trial?: boolean }) =>
    api.post<{ message: string }>('/api/stripe/change-plan', params),
};

export default subscriptionApi;
