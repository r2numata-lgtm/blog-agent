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
          {/* 機能1: スタイル学習 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              スタイル学習
            </h3>
            <p className="text-gray-600 text-sm">
              あなたの過去の記事からスタイルを学習。一貫した文体で記事を生成します。
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

          {/* 機能3: AI修正 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              チャットで修正
            </h3>
            <p className="text-gray-600 text-sm">
              生成された記事をチャットで指示するだけで、AIが修正します。
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
