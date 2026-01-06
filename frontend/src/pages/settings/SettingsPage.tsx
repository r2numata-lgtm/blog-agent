import { useState, useRef, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  useSettingsStore,
  tasteLabels,
  firstPersonLabels,
  readerAddressLabels,
  toneLabels,
  introStyleLabels,
  decorationLabels,
  type ArticleStyleSettings,
  type DecorationSettings,
} from '../../stores/settingsStore';

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const {
    settings,
    isSaving,
    updateArticleStyle,
    updateDecorations,
    updateSeo,
    addSampleArticle,
    removeSampleArticle,
    resetToDefaults,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'style' | 'sample' | 'decoration' | 'seo'>('style');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（100KB）
    if (file.size > 100 * 1024) {
      showError('ファイルサイズは100KB以下にしてください');
      return;
    }

    // ファイル形式チェック
    const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');
    const isMarkdown = file.name.endsWith('.md') || file.name.endsWith('.markdown');

    if (!isHtml && !isMarkdown) {
      showError('HTML (.html, .htm) または Markdown (.md) ファイルのみアップロード可能です');
      return;
    }

    try {
      const content = await file.text();
      const title = file.name.replace(/\.(html?|md|markdown)$/i, '');

      const added = addSampleArticle({
        title,
        content,
        format: isMarkdown ? 'markdown' : 'html',
      });

      if (added) {
        showSuccess('サンプル記事を追加しました');
      } else {
        showError('サンプル記事は最大3件までです');
      }
    } catch {
      showError('ファイルの読み込みに失敗しました');
    }

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveSample = (id: string, title: string) => {
    if (window.confirm(`「${title}」を削除しますか？`)) {
      removeSampleArticle(id);
      showSuccess('サンプル記事を削除しました');
    }
  };

  const handleReset = () => {
    if (window.confirm('設定を初期状態に戻しますか？')) {
      resetToDefaults();
      showSuccess('設定を初期化しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ナビゲーション */}
      <nav className="bg-white shadow-sm p-4 mb-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex gap-4">
            <Link to="/" className="text-blue-600 hover:text-blue-800 font-semibold">
              ホーム
            </Link>
            <span className="text-gray-900 font-semibold">設定</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button onClick={signOut} className="text-sm text-red-600 hover:text-red-800">
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">記事設定</h1>
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            初期設定に戻す
          </button>
        </div>

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}

        {/* タブ */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('style')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'style'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            記事スタイル
          </button>
          <button
            onClick={() => setActiveTab('sample')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'sample'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            サンプル記事
          </button>
          <button
            onClick={() => setActiveTab('decoration')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'decoration'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            装飾プリセット
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'seo'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            SEO設定
          </button>
        </div>

        {/* 記事スタイル設定 */}
        {activeTab === 'style' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* テイスト */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                記事のテイスト
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(tasteLabels) as ArticleStyleSettings['taste'][]).map((key) => (
                  <button
                    key={key}
                    onClick={() => updateArticleStyle({ taste: key })}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                      settings.articleStyle.taste === key
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tasteLabels[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* 一人称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">一人称</label>
              <div className="flex gap-2">
                {(Object.keys(firstPersonLabels) as ArticleStyleSettings['firstPerson'][]).map(
                  (key) => (
                    <button
                      key={key}
                      onClick={() => updateArticleStyle({ firstPerson: key })}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                        settings.articleStyle.firstPerson === key
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {firstPersonLabels[key]}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 読者への呼びかけ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                読者への呼びかけ
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(readerAddressLabels) as ArticleStyleSettings['readerAddress'][]).map(
                  (key) => (
                    <button
                      key={key}
                      onClick={() => updateArticleStyle({ readerAddress: key })}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                        settings.articleStyle.readerAddress === key
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {readerAddressLabels[key]}
                    </button>
                  )
                )}
              </div>
              {settings.articleStyle.readerAddress === 'custom' && (
                <input
                  type="text"
                  placeholder="例: ○○をお探しの方"
                  value={settings.articleStyle.readerAddressCustom || ''}
                  onChange={(e) =>
                    updateArticleStyle({ readerAddressCustom: e.target.value })
                  }
                  className="mt-2 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* トーン */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">トーン</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(toneLabels) as ArticleStyleSettings['tone'][]).map((key) => (
                  <button
                    key={key}
                    onClick={() => updateArticleStyle({ tone: key })}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                      settings.articleStyle.tone === key
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {toneLabels[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* 導入の書き方 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                導入の書き方
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(introStyleLabels) as ArticleStyleSettings['introStyle'][]).map(
                  (key) => (
                    <button
                      key={key}
                      onClick={() => updateArticleStyle({ introStyle: key })}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                        settings.articleStyle.introStyle === key
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {introStyleLabels[key]}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* サンプル記事設定 */}
        {activeTab === 'sample' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-4">
              既存のブログ記事をサンプルとしてアップロードすると、文体・構成を学習して記事生成に反映します。
              最大3記事までアップロード可能です。
            </p>

            {/* アップロードエリア */}
            <div className="mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.md,.markdown"
                onChange={handleFileUpload}
                className="hidden"
                id="sample-upload"
              />
              <label
                htmlFor="sample-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition ${
                  settings.sampleArticles.length >= 3
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {settings.sampleArticles.length >= 3 ? (
                  <p className="text-sm text-gray-400">
                    サンプル記事の上限（3件）に達しました
                  </p>
                ) : (
                  <>
                    <svg
                      className="w-8 h-8 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">
                      クリックまたはドラッグ&ドロップでアップロード
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      HTML (.html) または Markdown (.md) / 最大100KB
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* アップロード済みサンプル記事一覧 */}
            {settings.sampleArticles.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  アップロード済み（{settings.sampleArticles.length}/3件）
                </h3>
                {settings.sampleArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          article.format === 'html'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {article.format.toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{article.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(article.createdAt).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSample(article.id, article.title)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="削除"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4">
                サンプル記事がアップロードされていません
              </p>
            )}
          </div>
        )}

        {/* 装飾プリセット設定 */}
        {activeTab === 'decoration' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-4">
              記事生成時に使用する装飾を選択してください。
            </p>
            <div className="space-y-3">
              {(Object.keys(decorationLabels) as (keyof DecorationSettings)[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                >
                  <span className="text-gray-700">{decorationLabels[key]}</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.decorations[key]}
                      onChange={(e) => updateDecorations({ [key]: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-6 rounded-full transition ${
                        settings.decorations[key] ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                          settings.decorations[key] ? 'translate-x-5' : 'translate-x-1'
                        } mt-1`}
                      />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* SEO設定 */}
        {activeTab === 'seo' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* メタディスクリプション長 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メタディスクリプション長: {settings.seo.metaDescriptionLength}文字
              </label>
              <input
                type="range"
                min={120}
                max={160}
                value={settings.seo.metaDescriptionLength}
                onChange={(e) =>
                  updateSeo({ metaDescriptionLength: parseInt(e.target.value, 10) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>120</span>
                <span>160</span>
              </div>
            </div>

            {/* キーワード数上限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                キーワード数の上限: {settings.seo.maxKeywords}個
              </label>
              <input
                type="range"
                min={5}
                max={10}
                value={settings.seo.maxKeywords}
                onChange={(e) => updateSeo({ maxKeywords: parseInt(e.target.value, 10) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          </div>
        )}

        {/* 保存状態表示 */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          {isSaving ? (
            '保存中...'
          ) : settings.lastUpdated ? (
            `最終更新: ${new Date(settings.lastUpdated).toLocaleString('ja-JP')}`
          ) : (
            '設定は自動的に保存されます'
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
