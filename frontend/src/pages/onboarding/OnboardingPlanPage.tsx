import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import PricingTable from '../../components/subscription/PricingTable';

export const OnboardingPlanPage = () => {
  const { signOut } = useAuth();
  const { hasActiveSubscription, loading } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 既にサブスクがある場合はホームへ
  if (hasActiveSubscription) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            プランを選択してください
          </h1>
          <p className="text-gray-600">
            Starter プランは14日間の無料トライアル付き。トライアル中はいつでもキャンセル可能です。
          </p>
        </div>

        {/* プラン選択 */}
        <PricingTable
          successUrl={`${window.location.origin}/onboarding/success`}
          cancelUrl={`${window.location.origin}/onboarding/plan`}
        />

        {/* ログアウト */}
        <div className="text-center mt-8">
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPlanPage;
