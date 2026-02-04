import { Link } from 'react-router-dom';

export const HomePage = () => {
  return (
    <div className="p-8">
      {/* ヒーローセクション */}
      <div className="max-w-4xl mx-auto text-center mb-16">
        <img
          src="/logo.png"
          alt="MyBlog AI"
          className="w-32 h-32 mx-auto mb-8 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          MyBlog AI
        </h1>
        <p className="text-2xl text-blue-600 font-medium mb-8">
          あなたの書き方で、AIが記事を書く。
        </p>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          あなたのスタイルを学習し、高品質なブログ記事を自動生成。
          WordPress、Markdownなど、様々な形式に対応しています。
        </p>
        <Link
          to="/generate"
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          記事を生成する
        </Link>
      </div>

      {/* 機能紹介 */}
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          主な機能
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 機能1: スタイル設定 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              スタイル設定
            </h3>
            <p className="text-gray-600 text-sm">
              文体や装飾をカスタマイズ。あなた好みのスタイルで記事を生成します。
            </p>
          </div>

          {/* 機能2: マルチ出力形式 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              マルチ出力形式
            </h3>
            <p className="text-gray-600 text-sm">
              WordPress、Markdownなど、用途に合わせた形式で出力できます。
            </p>
          </div>

          {/* 機能3: 記事管理 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              記事管理
            </h3>
            <p className="text-gray-600 text-sm">
              生成した記事の保存・編集・エクスポートが簡単にできます。
            </p>
          </div>
        </div>
      </div>

      {/* 使い方 */}
      <div className="max-w-4xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          かんたん3ステップ
        </h2>
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* ステップ1 */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              要点を入力
            </h3>
            <p className="text-gray-600 text-sm">
              記事に含めたい要点やキーワードを入力します。
            </p>
          </div>

          {/* 矢印 */}
          <div className="hidden md:flex items-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* ステップ2 */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              タイトルを選択
            </h3>
            <p className="text-gray-600 text-sm">
              AIが提案する3つのタイトルから選択します。
            </p>
          </div>

          {/* 矢印 */}
          <div className="hidden md:flex items-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* ステップ3 */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              記事を確認・編集
            </h3>
            <p className="text-gray-600 text-sm">
              生成された記事を確認し、必要に応じて編集します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
