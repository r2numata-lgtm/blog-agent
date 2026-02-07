import { useSubscriptionStatus } from '../../hooks/useSubscription';

export default function TrialBanner() {
  const { data } = useSubscriptionStatus();

  if (!data || data.subscription_status !== 'trialing' || !data.trial_end) return null;

  const daysLeft = Math.ceil(
    (new Date(data.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) return null;

  const isUrgent = daysLeft <= 3;

  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm ${
        isUrgent
          ? 'bg-orange-50 border border-orange-200 text-orange-800'
          : 'bg-blue-50 border border-blue-200 text-blue-800'
      }`}
    >
      <span className="font-semibold">
        無料トライアル残り{daysLeft}日
      </span>
      <span className="ml-2">
        トライアル終了後、Starterプラン（¥1,480/月・税込）に自動移行します
      </span>
    </div>
  );
}
