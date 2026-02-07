import { useSubscriptionUsage } from '../../hooks/useSubscription';

export default function UsageIndicator() {
  const { data, loading } = useSubscriptionUsage();

  if (loading || !data) return null;

  const percentage = data.article_percentage;
  const isWarning = percentage >= 80;

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">今月の記事生成</span>
        <span className={`text-sm font-semibold ${isWarning ? 'text-orange-600' : 'text-gray-900'}`}>
          {data.article_used} / {data.article_limit === -1 ? '∞' : data.article_limit} 本
        </span>
      </div>
      {data.article_limit !== -1 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isWarning ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
      {isWarning && (
        <p className="text-xs text-orange-600 mt-1">上限に近づいています</p>
      )}
      {data.reset_date && (
        <p className="text-xs text-gray-400 mt-1">
          リセット日: {new Date(data.reset_date).toLocaleDateString('ja-JP')}
        </p>
      )}
    </div>
  );
}
