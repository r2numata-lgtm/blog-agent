import { useState } from 'react';
import subscriptionApi from '../../services/subscriptionApi';
import PlanChangeModal from './PlanChangeModal';

const PLANS = [
  {
    name: 'Starter',
    price: 1480,
    priceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
    features: [
      '月20本まで記事生成',
      'WordPress / Markdown出力',
      '記事の保存・再編集・エクスポート',
    ],
    recommended: false,
    hasTrial: true,
  },
  {
    name: 'Pro',
    price: 3980,
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    features: [
      '月150本まで記事生成',
      'WordPress / Markdown出力',
      '記事の保存・再編集・エクスポート',
    ],
    recommended: true,
    hasTrial: false,
  },
];

interface PricingTableProps {
  currentPlan?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: string | null;
  successUrl?: string;
  cancelUrl?: string;
  scheduledPlanType?: string | null;
}

type ChangeType = 'upgrade' | 'downgrade' | 'trial_to_pro' | 'past_due';

export default function PricingTable({
  currentPlan,
  subscriptionStatus,
  currentPeriodEnd,
  successUrl,
  cancelUrl,
  scheduledPlanType,
}: PricingTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalChangeType, setModalChangeType] = useState<ChangeType>('upgrade');
  const [modalTargetPriceId, setModalTargetPriceId] = useState('');

  const handleSubscribe = async (priceId: string, hasTrial: boolean) => {
    console.log('handleSubscribe called:', { priceId, hasTrial });
    if (!priceId) {
      console.error('priceId is empty or undefined');
      return;
    }
    setLoading(priceId);
    try {
      console.log('Creating checkout session...');
      const result = await subscriptionApi.createCheckoutSession({
        price_id: priceId,
        success_url: successUrl || `${window.location.origin}/onboarding/success`,
        cancel_url: cancelUrl || `${window.location.origin}/onboarding/plan`,
        trial: hasTrial,
      });
      console.log('Checkout session created:', result);
      window.location.href = result.url;
    } catch (e) {
      console.error('Checkout session creation failed:', e);
      setLoading(null);
    }
  };

  const handleChangePlanClick = (targetPlanName: string, targetPriceId: string) => {
    // past_due の場合は支払い修復画面
    if (subscriptionStatus === 'past_due') {
      setModalChangeType('past_due');
      setModalTargetPriceId(targetPriceId);
      setModalOpen(true);
      return;
    }

    // 変更種別を判定
    let changeType: ChangeType;
    if (subscriptionStatus === 'trialing' && targetPlanName === 'pro') {
      changeType = 'trial_to_pro';
    } else if (currentPlan === 'starter' && targetPlanName === 'pro') {
      changeType = 'upgrade';
    } else if (currentPlan === 'pro' && targetPlanName === 'starter') {
      changeType = 'downgrade';
    } else {
      // デフォルト（念のため）
      changeType = 'upgrade';
    }

    setModalChangeType(changeType);
    setModalTargetPriceId(targetPriceId);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    window.location.reload();
  };

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isPastDue = subscriptionStatus === 'past_due';

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.name.toLowerCase();
          const planNameLower = plan.name.toLowerCase();
          return (
            <div
              key={plan.name}
              className={`border rounded-lg p-6 ${
                plan.recommended ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
            >
              {plan.recommended && (
                <span className="inline-block bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded mb-3">
                  おすすめ
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">¥{plan.price.toLocaleString()}</span>
                <span className="text-gray-500 text-sm">（税込）/ 月</span>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                  >
                    現在のプラン
                  </button>
                ) : scheduledPlanType === planNameLower ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-amber-100 text-amber-700 rounded-lg cursor-not-allowed"
                  >
                    変更予約済み
                  </button>
                ) : isActive || isPastDue ? (
                  <button
                    onClick={() => handleChangePlanClick(planNameLower, plan.priceId)}
                    disabled={loading === plan.priceId || !!scheduledPlanType}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading === plan.priceId ? '処理中...' : 'プランを変更'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.priceId, plan.hasTrial)}
                    disabled={loading === plan.priceId}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading === plan.priceId ? '処理中...' : plan.hasTrial ? '14日間無料で始める' : '今すぐ始める'}
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-400 text-center">
                表示価格が最終お支払い金額です
              </p>
            </div>
          );
        })}
      </div>

      <PlanChangeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        changeType={modalChangeType}
        targetPriceId={modalTargetPriceId}
        currentPeriodEnd={currentPeriodEnd}
      />
    </>
  );
}
