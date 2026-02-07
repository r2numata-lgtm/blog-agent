import { useState } from 'react';
import subscriptionApi from '../../services/subscriptionApi';

type ChangeType = 'upgrade' | 'downgrade' | 'trial_to_pro' | 'past_due';

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  changeType: ChangeType;
  targetPriceId: string;
  currentPeriodEnd?: string | null;
}

const STARTER_PRICE = 1480;
const PRO_PRICE = 3980;

export default function PlanChangeModal({
  isOpen,
  onClose,
  onSuccess,
  changeType,
  targetPriceId,
  currentPeriodEnd,
}: PlanChangeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (changeType === 'past_due') {
      // Customer Portal へ誘導
      try {
        setLoading(true);
        const result = await subscriptionApi.createPortalSession({
          return_url: window.location.href,
        });
        window.location.href = result.url;
      } catch (e) {
        setError('エラーが発生しました');
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await subscriptionApi.changePlan({
        price_id: targetPriceId,
        immediate: changeType !== 'downgrade',
        end_trial: changeType === 'trial_to_pro',
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'プラン変更に失敗しました');
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 日割り概算（簡易計算）
  const calculateProration = () => {
    if (!currentPeriodEnd) return PRO_PRICE - STARTER_PRICE;
    const now = new Date();
    const endDate = new Date(currentPeriodEnd);
    const totalDays = 30;
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyDiff = (PRO_PRICE - STARTER_PRICE) / totalDays;
    return Math.round(dailyDiff * remainingDays);
  };

  const renderContent = () => {
    switch (changeType) {
      case 'upgrade':
        return (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Proプランにアップグレードしますか？
            </h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-2">Proプランの特徴</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    月150本まで記事生成（Starter: 20本）
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    WordPress / Markdown出力
                  </li>
                </ul>
              </div>
              <div className="border-t pt-4">
                <p className="flex items-center gap-2 text-gray-900">
                  <span className="text-blue-500">●</span>
                  本日から即時利用可能
                </p>
                <p className="flex items-center gap-2 text-gray-900 mt-1">
                  <span className="text-blue-500">●</span>
                  差額は日割りで即時請求されます
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span>今回の請求額（概算）</span>
                  <span className="font-semibold">¥{calculateProration().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>次回請求日</span>
                  <span>{formatDate(currentPeriodEnd)} / ¥{PRO_PRICE.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '処理中...' : 'アップグレードする（今すぐ）'}
              </button>
            </div>
          </>
        );

      case 'downgrade':
        return (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Starterプランに変更しますか？
            </h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="font-semibold text-amber-900 mb-2">変更後の制限</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-amber-500">!</span>
                    月20本まで記事生成（現在: 150本）
                  </li>
                </ul>
              </div>
              <div className="border-t pt-4">
                <p className="flex items-center gap-2 text-gray-900">
                  <span className="text-blue-500">●</span>
                  次回請求日（{formatDate(currentPeriodEnd)}）からStarterプランになります
                </p>
                <p className="flex items-center gap-2 text-gray-900 mt-1">
                  <span className="text-blue-500">●</span>
                  それまでは現在のProプランをご利用いただけます
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? '処理中...' : '次回から変更する'}
              </button>
            </div>
          </>
        );

      case 'trial_to_pro':
        return (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Proプランを今すぐ利用しますか？
            </h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-2">ご確認ください</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">●</span>
                    トライアル期間は終了します
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">●</span>
                    本日から¥{PRO_PRICE.toLocaleString()}/月が課金されます
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">●</span>
                    Pro機能が即時解放されます
                  </li>
                </ul>
              </div>
              <p className="text-center text-gray-500">
                いつでも解約できます
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? '処理中...' : 'Proプランを開始する'}
              </button>
            </div>
          </>
        );

      case 'past_due':
        return (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              お支払いに問題があります
            </h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-red-900">
                  お支払い情報に問題があるため、プラン変更ができません。
                  先にお支払い情報を更新してください。
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                閉じる
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? '処理中...' : '支払い情報を更新する'}
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}
