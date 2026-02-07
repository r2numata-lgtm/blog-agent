import { useSubscriptionStatus } from '../../hooks/useSubscription';

export default function DowngradedNotice() {
  const { data } = useSubscriptionStatus();

  if (!data) return null;

  // ダウングレード後に使用量が新上限を超えている場合のみ表示
  if (data.article_limit === -1 || data.article_count <= data.article_limit) return null;

  const resetDate = data.current_period_end
    ? new Date(data.current_period_end).toLocaleDateString('ja-JP')
    : null;

  return (
    <div className="rounded-lg px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      <p>
        今月は{data.article_count}本生成済みです。
        新しい上限（{data.article_limit}本）を超えているため、今月の追加生成はできません。
      </p>
      {resetDate && (
        <p className="mt-1 text-amber-600">
          次回更新日（{resetDate}）にリセットされます。
        </p>
      )}
    </div>
  );
}
