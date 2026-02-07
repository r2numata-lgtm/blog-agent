import { useState } from 'react';
import { useSubscriptionStatus } from '../../hooks/useSubscription';
import subscriptionApi from '../../services/subscriptionApi';

export default function PaymentFailedBanner() {
  const { data } = useSubscriptionStatus();
  const [loading, setLoading] = useState(false);

  if (!data || data.subscription_status !== 'past_due') return null;

  const handleUpdateCard = async () => {
    setLoading(true);
    try {
      const result = await subscriptionApi.createPortalSession({
        return_url: window.location.href,
      });
      window.location.href = result.url;
    } catch (e) {
      console.error('Portal session creation failed:', e);
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg px-4 py-3 bg-red-50 border border-red-200 text-red-800 flex items-center justify-between">
      <span className="text-sm">
        <span className="font-semibold">お支払いに失敗しました。</span>
        <span className="ml-1">カード情報をご確認ください。</span>
      </span>
      <button
        onClick={handleUpdateCard}
        disabled={loading}
        className="ml-4 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg disabled:opacity-50"
      >
        {loading ? '処理中...' : 'カードを更新する'}
      </button>
    </div>
  );
}
