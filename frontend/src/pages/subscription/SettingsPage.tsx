import { useState } from 'react';
import { useSubscriptionStatus } from '../../hooks/useSubscription';
import subscriptionApi from '../../services/subscriptionApi';
import PlanBadge from '../../components/subscription/PlanBadge';
import UsageIndicator from '../../components/subscription/UsageIndicator';
import TrialBanner from '../../components/subscription/TrialBanner';
import PaymentFailedBanner from '../../components/subscription/PaymentFailedBanner';
import DowngradedNotice from '../../components/subscription/DowngradedNotice';
import PricingTable from '../../components/subscription/PricingTable';

export const SettingsPage = () => {
  const { data, loading } = useSubscriptionStatus();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManagePlan = async () => {
    setPortalLoading(true);
    try {
      const result = await subscriptionApi.createPortalSession({
        return_url: window.location.href,
      });
      window.location.href = result.url;
    } catch (e) {
      console.error('Portal session creation failed:', e);
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isActive = data?.subscription_status === 'active' || data?.subscription_status === 'trialing';
  const isCanceled = data?.subscription_status === 'canceled';
  const hasSubscription = isActive || isCanceled || data?.subscription_status === 'past_due';

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          プラン管理
        </h1>

        {/* バナー表示 */}
        <div className="space-y-3 mb-6">
          <TrialBanner />
          <PaymentFailedBanner />
          <DowngradedNotice />
        </div>

        {/* 現在のプラン情報 */}
        {data && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">現在のプラン</h2>
              <PlanBadge
                planType={data.plan_type}
                subscriptionStatus={data.subscription_status}
              />
            </div>

            <div className="space-y-3">
              {data.current_period_end && isActive && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">次回更新日</span>
                  <span className="text-gray-900">
                    {new Date(data.current_period_end).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
              {data.cancel_at_period_end && data.current_period_end && (
                <p className="text-sm text-orange-600">
                  {new Date(data.current_period_end).toLocaleDateString('ja-JP')} に解約予定です
                </p>
              )}
              {data.scheduled_plan_type && data.scheduled_change_at && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">予約中の変更:</span>{' '}
                    {new Date(data.scheduled_change_at).toLocaleDateString('ja-JP')} から{' '}
                    <span className="font-semibold capitalize">{data.scheduled_plan_type}</span> プラン
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    それまでは現在のプランをご利用いただけます
                  </p>
                </div>
              )}
            </div>

            {/* Customer Portal ボタン */}
            {isActive && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={handleManagePlan}
                  disabled={portalLoading}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {portalLoading ? '読み込み中...' : '支払い方法・解約の管理'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 使用量 */}
        {isActive && (
          <div className="mb-6">
            <UsageIndicator />
          </div>
        )}

        {/* プラン変更 / 再登録 */}
        {isActive && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">プランを変更</h2>
            <PricingTable
              currentPlan={data?.plan_type}
              subscriptionStatus={data?.subscription_status}
              currentPeriodEnd={data?.current_period_end}
              scheduledPlanType={data?.scheduled_plan_type}
            />
          </div>
        )}

        {isCanceled && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              サブスクリプションは解約済みです
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              再度ご利用いただくには、プランにお申し込みください。
            </p>
            <PricingTable />
          </div>
        )}

        {/* 未契約ユーザー向け */}
        {!hasSubscription && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              プランを選択してください
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              14日間の無料トライアルからスタートできます。トライアル中はいつでもキャンセル可能です。
            </p>
            <PricingTable />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
