interface PlanBadgeProps {
  planType: string;
  subscriptionStatus: string;
}

const BADGE_STYLES: Record<string, string> = {
  trialing: 'bg-purple-100 text-purple-700',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-green-100 text-green-700',
  canceled: 'bg-gray-100 text-gray-500',
  past_due: 'bg-red-100 text-red-700',
};

const BADGE_LABELS: Record<string, string> = {
  trialing: 'トライアル',
  starter: 'Starter',
  pro: 'Pro',
  canceled: '解約済み',
  past_due: '支払い保留',
};

export default function PlanBadge({ planType, subscriptionStatus }: PlanBadgeProps) {
  // 未契約ユーザー
  if (!subscriptionStatus && !planType) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        未登録
      </span>
    );
  }

  const key = subscriptionStatus === 'trialing' ? 'trialing'
    : subscriptionStatus === 'past_due' ? 'past_due'
    : subscriptionStatus === 'canceled' ? 'canceled'
    : planType;

  const style = BADGE_STYLES[key] || BADGE_STYLES.canceled;
  const label = BADGE_LABELS[key] || planType;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
