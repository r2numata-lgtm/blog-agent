/**
 * 記事生成ページ
 * Phase 2: P2-10〜P2-13 フロントエンド実装
 *
 * P2-10: 記事生成フォーム
 * P2-11: 内部リンク入力UI
 * P2-12: プログレス表示（生成中）
 * P2-13: タイトル選択UI（3案）
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  articleApi,
  type GenerateArticleRequest,
  type TitleSuggestion,
  type InternalLink,
} from '../../services/articleApi';
import {
  getErrorMessage,
  isRetryableError,
  withRetry,
  logError,
} from '../../utils/errorHandler';

// 記事タイプのオプション
const articleTypes = [
  { value: 'info', label: '情報提供型', description: '知識や情報を整理して伝える記事' },
  { value: 'howto', label: 'ハウツー型', description: '手順やノウハウを解説する記事' },
  { value: 'review', label: 'レビュー・体験談型', description: '実体験に基づいた感想や評価' },
] as const;

// 文字数オプション
const wordCountOptions = [
  { value: 1000, label: '1000文字（短め）' },
  { value: 1500, label: '1500文字（標準）' },
  { value: 2000, label: '2000文字（やや長め）' },
  { value: 3000, label: '3000文字（長め）' },
  { value: 5000, label: '5000文字（詳細）' },
];

/**
 * 記事生成ページコンポーネント
 */
const GeneratePage: React.FC = () => {
  const navigate = useNavigate();

  // フォーム状態
  const [title, setTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [purpose, setPurpose] = useState('');
  const [keywords, setKeywords] = useState('');
  const [contentPoints, setContentPoints] = useState('');
  const [wordCount, setWordCount] = useState(1500);
  const [articleType, setArticleType] = useState<'info' | 'howto' | 'review'>('info');
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);

  // タイトル選択状態（P2-13）
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // 生成状態（P2-12）
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');

  // エラー状態
  const [error, setError] = useState<string | null>(null);
  const [isErrorRetryable, setIsErrorRetryable] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // 内部リンク追加（P2-11）
  const addInternalLink = () => {
    setInternalLinks([...internalLinks, { url: '', title: '', description: '' }]);
  };

  const updateInternalLink = (index: number, field: keyof InternalLink, value: string) => {
    const newLinks = [...internalLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setInternalLinks(newLinks);
  };

  const removeInternalLink = (index: number) => {
    setInternalLinks(internalLinks.filter((_, i) => i !== index));
  };

  // エラーをクリア
  const clearError = useCallback(() => {
    setError(null);
    setIsErrorRetryable(false);
  }, []);

  // タイトル案を生成（P2-13）
  const handleGenerateTitles = async () => {
    if (!contentPoints.trim()) {
      setError('本文の要点を入力してください');
      setIsErrorRetryable(false);
      return;
    }

    setIsGeneratingTitles(true);
    clearError();

    try {
      const response = await withRetry(
        () => articleApi.generateTitles({
          title: title || undefined,
          targetAudience: targetAudience || undefined,
          keywords: keywords.split(/[,、\s]+/).filter(Boolean),
          contentPoints,
        }),
        {
          maxRetries: 2,
          delayMs: 1000,
          onRetry: (attempt) => {
            console.log(`タイトル生成リトライ: ${attempt}回目`);
          },
        }
      );

      setTitleSuggestions(response.titles);
      setShowTitleSuggestions(true);
    } catch (err) {
      logError(err, 'handleGenerateTitles');
      setError(getErrorMessage(err));
      setIsErrorRetryable(isRetryableError(err));
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // タイトルを選択（P2-13）
  const selectTitle = (selectedTitle: string) => {
    setTitle(selectedTitle);
    setShowTitleSuggestions(false);
  };

  // 記事を生成（P2-10）
  const handleGenerate = async (isRetry = false) => {
    // バリデーション
    if (!title.trim()) {
      setError('タイトルを入力してください');
      setIsErrorRetryable(false);
      return;
    }
    if (!contentPoints.trim()) {
      setError('本文の要点を入力してください');
      setIsErrorRetryable(false);
      return;
    }

    if (isRetry) {
      setRetryCount((prev) => prev + 1);
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus(isRetry ? '再試行中...' : '記事を生成中...');
    clearError();

    // プログレス表示（P2-12）
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      setGenerationStatus('AIが記事を執筆中...');
      setGenerationProgress(30);

      const request: GenerateArticleRequest = {
        title,
        targetAudience: targetAudience || undefined,
        purpose: purpose || undefined,
        keywords: keywords.split(/[,、\s]+/).filter(Boolean),
        contentPoints,
        wordCount,
        articleType,
        internalLinks: internalLinks.filter((link) => link.url && link.title),
      };

      const response = await withRetry(
        () => articleApi.generate(request),
        {
          maxRetries: 2,
          delayMs: 2000,
          onRetry: (attempt) => {
            setGenerationStatus(`リトライ中 (${attempt}/2)...`);
          },
        }
      );

      setGenerationStatus('生成完了！');
      setGenerationProgress(100);

      clearInterval(progressInterval);
      setRetryCount(0);

      // 記事編集ページへ遷移
      setTimeout(() => {
        navigate(`/articles/${response.articleId}/edit`);
      }, 1000);
    } catch (err) {
      clearInterval(progressInterval);
      logError(err, 'handleGenerate');
      setError(getErrorMessage(err));
      setIsErrorRetryable(isRetryableError(err));
      setIsGenerating(false);
    }
  };

  // リトライハンドラー
  const handleRetry = () => {
    if (retryCount < 3) {
      handleGenerate(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">記事を生成</h1>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <span className="text-red-500 mr-2">⚠️</span>
                <div>
                  <p className="text-red-700">{error}</p>
                  {isErrorRetryable && retryCount < 3 && (
                    <p className="text-sm text-red-600 mt-1">
                      一時的なエラーの可能性があります。再試行してください。
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {isErrorRetryable && retryCount < 3 && (
                  <button
                    onClick={handleRetry}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    再試行
                  </button>
                )}
                <button
                  onClick={clearError}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 生成中のオーバーレイ（P2-12） */}
        {isGenerating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4 text-center">{generationStatus}</h2>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-center text-gray-600 text-sm">
                AIが記事を生成しています。しばらくお待ちください...
              </p>
            </div>
          </div>
        )}

        {/* タイトル選択モーダル（P2-13） */}
        {showTitleSuggestions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">タイトル案を選択</h2>
              <div className="space-y-4">
                {titleSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectTitle(suggestion.title)}
                    className="w-full text-left p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <p className="font-medium text-gray-900 mb-1">{suggestion.title}</p>
                    <p className="text-sm text-gray-600">{suggestion.reason}</p>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowTitleSuggestions(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 記事生成フォーム（P2-10） */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="記事のタイトルを入力"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleGenerateTitles}
                disabled={isGeneratingTitles}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
              >
                {isGeneratingTitles ? '生成中...' : 'AIに提案させる'}
              </button>
            </div>
          </div>

          {/* 記事タイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">記事タイプ</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {articleTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setArticleType(type.value)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    articleType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 対象読者 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">対象読者</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="例: プログラミング初心者、30代の会社員"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 記事の目的 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">記事の目的</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="例: 読者にReactの基本を理解してもらう"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* キーワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワード（カンマ区切り）
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="例: React, JavaScript, 入門, コンポーネント"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 本文の要点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              本文の要点 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={contentPoints}
              onChange={(e) => setContentPoints(e.target.value)}
              placeholder="記事に含めたい内容、ポイント、構成案などを入力してください"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              {contentPoints.length} / 5000文字
            </p>
          </div>

          {/* 文字数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">目標文字数</label>
            <select
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {wordCountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 内部リンク（P2-11） */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                内部リンク（任意）
              </label>
              <button
                onClick={addInternalLink}
                disabled={internalLinks.length >= 10}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                + リンクを追加
              </button>
            </div>
            {internalLinks.length > 0 ? (
              <div className="space-y-3">
                {internalLinks.map((link, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateInternalLink(index, 'url', e.target.value)}
                        placeholder="URL（例: https://example.com/article）"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => removeInternalLink(index)}
                        className="text-red-500 hover:text-red-600 px-2"
                      >
                        削除
                      </button>
                    </div>
                    <input
                      type="text"
                      value={link.title}
                      onChange={(e) => updateInternalLink(index, 'title', e.target.value)}
                      placeholder="リンクのタイトル"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={link.description || ''}
                      onChange={(e) => updateInternalLink(index, 'description', e.target.value)}
                      placeholder="説明（任意）"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                関連する記事のURLを追加すると、AIが適切な箇所にリンクを挿入します
              </p>
            )}
          </div>

          {/* 生成ボタン */}
          <div className="pt-4 border-t">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !title.trim() || !contentPoints.trim()}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? '生成中...' : '記事を生成する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratePage;
