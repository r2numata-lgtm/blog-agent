import { useState } from 'react';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
  current?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: '無料プラン',
    price: '0',
    period: '永久無料',
    features: [
      '月3記事まで生成',
      '基本的な装飾',
      'Markdown/note出力',
      'メールサポート',
    ],
    current: true,
  },
  {
    id: 'standard',
    name: 'スタンダード',
    price: '980',
    period: '/月',
    features: [
      '月30記事まで生成',
      '全ての装飾利用可能',
      '全ての出力形式対応',
      'チャット修正無制限',
      '優先サポート',
    ],
    recommended: true,
  },
  {
    id: 'pro',
    name: 'プロ',
    price: '2,980',
    period: '/月',
    features: [
      '無制限の記事生成',
      '全ての装飾利用可能',
      '全ての出力形式対応',
      'チャット修正無制限',
      '優先サポート',
      'API連携（準備中）',
      'チーム機能（準備中）',
    ],
  },
];

export const UpgradePage = () => {
  const [, setSelectedPlan] = useState<string | null>(null);

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    // TODO: 決済処理
    alert('決済機能は近日公開予定です');
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          プランアップグレード
        </h1>
        <p className="text-gray-600 mb-8">
          あなたに合ったプランを選択してください
        </p>

        {/* プラン比較 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl p-6 border-2 transition-all ${
                plan.recommended
                  ? 'border-blue-500 shadow-lg'
                  : plan.current
                  ? 'border-green-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    おすすめ
                  </span>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    現在のプラン
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h2>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">
                    ¥{plan.price}
                  </span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.current}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.current
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : plan.recommended
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {plan.current ? '利用中' : 'このプランを選択'}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            よくある質問
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                プランはいつでも変更できますか？
              </h3>
              <p className="text-gray-600 text-sm">
                はい、いつでもプランの変更が可能です。アップグレードは即時反映され、ダウングレードは次の請求期間から適用されます。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                解約はできますか？
              </h3>
              <p className="text-gray-600 text-sm">
                はい、いつでも解約可能です。解約後も請求期間の終わりまでサービスをご利用いただけます。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                支払い方法は？
              </h3>
              <p className="text-gray-600 text-sm">
                クレジットカード（Visa、Mastercard、American Express）でお支払いいただけます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
