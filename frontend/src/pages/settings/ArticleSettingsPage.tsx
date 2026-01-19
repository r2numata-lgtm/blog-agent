import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useSettingsStore,
  tasteLabels,
  firstPersonLabels,
  readerAddressLabels,
  toneLabels,
  introStyleLabels,
  SEMANTIC_ROLES,
  type ArticleStyleSettings,
  type SemanticRole,
} from '../../stores/settingsStore';
import {
  getDecorationSettings,
  toggleDecorationEnabled,
  generateWordPressCSS,
  addCustomDecoration,
  deleteCustomDecoration,
  isStandardDecoration,
  getDecorationWithRoles,
  type Decoration,
} from '../../services/decorationService';
import type { DecorationWithRoles } from '../../stores/settingsStore';

export const ArticleSettingsPage = () => {
  const navigate = useNavigate();
  const {
    settings,
    isSaving,
    updateArticleStyle,
    updateSeo,
    addSampleArticle,
    removeSampleArticle,
    resetToDefaults,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'style' | 'sample' | 'decoration' | 'seo' | 'wordpress'>('style');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [decorationsWithRoles, setDecorationsWithRoles] = useState<DecorationWithRoles[]>([]);
  const [showCopied, setShowCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDecorationId, setNewDecorationId] = useState('');
  const [newDecorationName, setNewDecorationName] = useState('');
  const [newDecorationCSS, setNewDecorationCSS] = useState('');
  const [newDecorationRoles, setNewDecorationRoles] = useState<SemanticRole[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 装飾設定を読み込み
  useEffect(() => {
    const settings = getDecorationSettings();
    setDecorations(settings.decorations);
    setDecorationsWithRoles(getDecorationWithRoles());
  }, []);

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

    if (file.size > 100 * 1024) {
      showError('ファイルサイズは100KB以下にしてください');
      return;
    }

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

  // 装飾の有効/無効を切り替え
  const handleToggleDecoration = (id: string) => {
    const updated = toggleDecorationEnabled(id);
    if (updated) {
      setDecorations(prev => prev.map(d => d.id === id ? updated : d));
    }
  };

  // 装飾エディタを開く
  const handleEditDecoration = (id: string) => {
    navigate(`/decoration-editor?id=${id}`);
  };

  // WordPress CSSをコピー
  const handleCopyWordPressCSS = () => {
    const css = generateWordPressCSS();
    navigator.clipboard.writeText(css);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  // オリジナル装飾を追加
  const handleAddDecoration = () => {
    // role選択チェック
    if (newDecorationRoles.length === 0) {
      showError('少なくとも1つの役割を選択してください');
      return;
    }

    try {
      const idWithPrefix = newDecorationId.startsWith('ba-') ? newDecorationId : `ba-${newDecorationId}`;
      const css = newDecorationCSS || `.${idWithPrefix} {\n  /* スタイルを記述 */\n}`;

      const added = addCustomDecoration(idWithPrefix, newDecorationName, css, newDecorationRoles);
      if (added) {
        setDecorations(prev => [...prev, added]);
        setDecorationsWithRoles(getDecorationWithRoles());
        setShowAddModal(false);
        setNewDecorationId('');
        setNewDecorationName('');
        setNewDecorationCSS('');
        setNewDecorationRoles([]);
        showSuccess('オリジナル装飾を追加しました');
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : '装飾の追加に失敗しました');
    }
  };

  // role選択のトグル
  const handleToggleRole = (role: SemanticRole) => {
    setNewDecorationRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : prev.length < 3 ? [...prev, role] : prev
    );
  };

  // オリジナル装飾を削除
  const handleDeleteDecoration = (id: string, name: string) => {
    if (window.confirm(`「${name}」を削除しますか？`)) {
      try {
        deleteCustomDecoration(id);
        setDecorations(prev => prev.filter(d => d.id !== id));
        showSuccess('装飾を削除しました');
      } catch (e) {
        showError(e instanceof Error ? e.message : '装飾の削除に失敗しました');
      }
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">記事設定</h1>
            <p className="text-gray-600">
              記事生成時のスタイルや装飾を設定します
            </p>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            初期設定に戻す
          </button>
        </div>

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* タブ */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('style')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'style'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            記事スタイル
          </button>
          <button
            onClick={() => setActiveTab('sample')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'sample'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            サンプル記事
          </button>
          <button
            onClick={() => setActiveTab('decoration')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'decoration'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            装飾CSS
          </button>
          <button
            onClick={() => setActiveTab('wordpress')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'wordpress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            WordPress設定
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px whitespace-nowrap ${
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
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
                  className="mt-2 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-4">
              既存のブログ記事をサンプルとしてアップロードすると、文体・構成を学習して記事生成に反映します。
              最大3記事までアップロード可能です。
            </p>

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

        {/* 装飾CSS設定 */}
        {activeTab === 'decoration' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm text-gray-600">
                WordPress記事で使用する装飾CSSを管理します。各装飾をクリックしてCSSを編集できます。
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                オリジナル追加
              </button>
            </div>

            <div className="space-y-2">
              {decorations.map((decoration) => {
                // rolesを取得
                const decorationWithRoles = decorationsWithRoles.find(d => d.id === decoration.id);
                const roles = decorationWithRoles?.roles || [];

                return (
                <div
                  key={decoration.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleEditDecoration(decoration.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">
                        {decoration.displayName}
                      </span>
                      {isStandardDecoration(decoration.id) ? (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          標準
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                          オリジナル
                        </span>
                      )}
                      {decoration.isCustomized && isStandardDecoration(decoration.id) && (
                        <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                          編集済み
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        クラス名: <code className="bg-gray-200 px-1 rounded">.{decoration.id}</code>
                      </p>
                      {roles.length > 0 && (
                        <div className="flex gap-1">
                          {roles.map(role => (
                            <span
                              key={role}
                              className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                              title={SEMANTIC_ROLES[role]?.description}
                            >
                              {SEMANTIC_ROLES[role]?.label || role}
                            </span>
                          ))}
                        </div>
                      )}
                      {roles.length === 0 && (
                        <span className="text-xs text-red-500">
                          ※役割未設定（記事生成で使用されません）
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEditDecoration(decoration.id)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800"
                    >
                      編集
                    </button>
                    {!isStandardDecoration(decoration.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDecoration(decoration.id, decoration.displayName);
                        }}
                        className="px-2 py-1.5 text-sm text-red-500 hover:text-red-700"
                        title="削除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDecoration(decoration.id);
                      }}
                      className="cursor-pointer"
                    >
                      <div
                        className={`w-10 h-6 rounded-full transition ${
                          decoration.enabled ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                            decoration.enabled ? 'translate-x-5' : 'translate-x-1'
                          } mt-1`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* オリジナル装飾追加モーダル */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                オリジナル装飾を追加
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newDecorationName}
                    onChange={(e) => setNewDecorationName(e.target.value)}
                    placeholder="例: カスタムボックス"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    クラス名（ID） <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500 text-sm">
                      ba-
                    </span>
                    <input
                      type="text"
                      value={newDecorationId.replace(/^ba-/, '')}
                      onChange={(e) => setNewDecorationId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="custom-box"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    英小文字、数字、ハイフンのみ使用可能
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CSS（任意）
                  </label>
                  <textarea
                    value={newDecorationCSS}
                    onChange={(e) => setNewDecorationCSS(e.target.value)}
                    placeholder={`.ba-${newDecorationId || 'custom-box'} {\n  background-color: #f0f0f0;\n  padding: 16px;\n  border-radius: 8px;\n}`}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    空欄の場合はテンプレートが作成されます
                  </p>
                </div>

                {/* 役割（role）選択 - 必須 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    この装飾の役割 <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    AIが使い分ける基準になります（1〜3個選択）
                  </p>
                  <div className="space-y-2">
                    {(Object.entries(SEMANTIC_ROLES) as [SemanticRole, { label: string; description: string }][]).map(
                      ([role, { label, description }]) => (
                        <label
                          key={role}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            newDecorationRoles.includes(role)
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newDecorationRoles.includes(role)}
                            onChange={() => handleToggleRole(role)}
                            className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                          <div>
                            <span className="font-medium text-gray-900">{label}</span>
                            <p className="text-xs text-gray-500">{description}</p>
                          </div>
                        </label>
                      )
                    )}
                  </div>
                  {newDecorationRoles.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">
                      ※ 少なくとも1つの役割を選択してください
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewDecorationId('');
                    setNewDecorationName('');
                    setNewDecorationCSS('');
                    setNewDecorationRoles([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddDecoration}
                  disabled={!newDecorationName.trim() || !newDecorationId.trim() || newDecorationRoles.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WordPress設定ガイド */}
        {activeTab === 'wordpress' && (
          <div className="space-y-6">
            {/* セットアップガイド */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">WordPress セットアップガイド</h2>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    装飾CSSをWordPressに追加する手順
                  </h3>
                  <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
                    <li>下の「CSSをコピー」ボタンをクリック</li>
                    <li>WordPress管理画面にログイン</li>
                    <li>「外観」 → 「カスタマイズ」を開く</li>
                    <li>「追加CSS」セクションを選択</li>
                    <li>コピーしたCSSを貼り付け</li>
                    <li>「公開」ボタンをクリックして保存</li>
                  </ol>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyWordPressCSS}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    CSSをコピー
                  </button>
                  {showCopied && (
                    <span className="text-green-600 text-sm">コピーしました</span>
                  )}
                </div>
              </div>
            </div>

            {/* CSSプレビュー */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">CSS プレビュー</h2>
              <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                  {generateWordPressCSS()}
                </pre>
              </div>
            </div>

            {/* 使用方法 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">装飾の使用方法</h2>
              <div className="space-y-4 text-sm">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">ハイライト (.ba-highlight)</h4>
                  <code className="block bg-gray-900 text-gray-100 p-2 rounded text-xs">
                    {'<span class="ba-highlight">重要なテキスト</span>'}
                  </code>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">ポイントボックス (.ba-point)</h4>
                  <code className="block bg-gray-900 text-gray-100 p-2 rounded text-xs">
                    {'<div class="ba-point">\n  <p>ポイント内容</p>\n</div>'}
                  </code>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">警告ボックス (.ba-warning)</h4>
                  <code className="block bg-gray-900 text-gray-100 p-2 rounded text-xs">
                    {'<div class="ba-warning">\n  <p>警告内容</p>\n</div>'}
                  </code>
                </div>
                <p className="text-gray-500">
                  * 記事生成時に自動的に適切な装飾が適用されます
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SEO設定 */}
        {activeTab === 'seo' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
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

export default ArticleSettingsPage;
