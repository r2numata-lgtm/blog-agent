import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../contexts/SubscriptionContext';
import subscriptionApi from '../../services/subscriptionApi';

const POLL_INTERVAL = 2000; // 2秒
const MAX_POLLS = 15; // 最大15回 = 30秒

export const SuccessPage = () => {
  const navigate = useNavigate();
  const { refetch } = useSubscription();
  const [timedOut, setTimedOut] = useState(false);
  const pollCount = useRef(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const result = await subscriptionApi.getStatus();
        if (result.subscription_status) {
          // サブスク反映済み → Context を更新してホームへ
          await refetch();
          navigate('/', { replace: true });
          return;
        }
      } catch {
        // エラーは無視して次のポーリングへ
      }

      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        setTimedOut(true);
        return;
      }

      timer = setTimeout(poll, POLL_INTERVAL);
    };

    let timer = setTimeout(poll, POLL_INTERVAL);
    return () => clearTimeout(timer);
  }, [navigate, refetch]);

  const handleRetry = () => {
    setTimedOut(false);
    pollCount.current = 0;
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-xl p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          登録が完了しました
        </h1>

        {timedOut ? (
          <>
            <p className="text-gray-600 mb-6">
              サブスクリプションの反映に時間がかかっています。
              しばらく待ってから再度お試しください。
            </p>
            <button
              onClick={handleRetry}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              再読み込み
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              14日間の無料トライアルが開始されました。
              トライアル期間中はいつでもキャンセル可能です。
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-500">ホームへ移動中...</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SuccessPage;
