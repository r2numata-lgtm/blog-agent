/**
 * 記事生成ページ
 * 新フロー: 入力 → タイトル提案 → タイトル選択 → 記事生成
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  articleApi,
  type GenerateArticleRequest,
  type TitleSuggestion,
  type InternalLink,
  type JobStatus,
} from '../../services/articleApi';
import { createArticle, createMarkdownArticle } from '../../services/articleStorage';
import { initializeBlocks } from '../../utils/markdownToBlocks';
import { parse } from '@wordpress/blocks';
import {
  getErrorMessage,
  isRetryableError,
  withRetry,
  logError,
} from '../../utils/errorHandler';

// 出力形式の定義（WordPress と Markdown のみ）
const outputFormats = [
  { value: 'wordpress', label: 'WordPress', description: 'Gutenbergブロック形式' },
  { value: 'markdown', label: 'Markdown', description: '標準的なMarkdown形式' },
] as const;

type OutputFormat = typeof outputFormats[number]['value'];

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

// ステップの型定義
type Step = 'input' | 'title-selection' | 'generating' | 'complete';

/**
 * 記事生成ページコンポーネント
 */
const GeneratePage: React.FC = () => {
  const navigate = useNavigate();

  // 現在のステップ
  const [currentStep, setCurrentStep] = useState<Step>('input');

  // フォーム状態
  const [targetAudience, setTargetAudience] = useState('');
  const [purpose, setPurpose] = useState('');
  const [keywords, setKeywords] = useState('');
  const [contentPoints, setContentPoints] = useState('');
  const [wordCount, setWordCount] = useState(1500);
  const [articleType, setArticleType] = useState<'info' | 'howto' | 'review'>('info');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('wordpress');
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);

  // タイトル選択状態
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // 生成状態
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');

  // エラー状態
  const [error, setError] = useState<string | null>(null);
  const [isErrorRetryable, setIsErrorRetryable] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // 戻る確認ダイアログ
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // 内部リンク追加
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

  // 戻るボタンのハンドラー
  const handleBack = () => {
    if (currentStep === 'title-selection') {
      setShowBackConfirm(true);
    }
  };

  const confirmBack = () => {
    setShowBackConfirm(false);
    setCurrentStep('input');
    setTitleSuggestions([]);
    setSelectedTitle('');
  };

  // タイトル案を生成
  const handleGenerateTitles = async () => {
    if (!contentPoints.trim()) {
      setError('本文の要点を入力してください');
      setIsErrorRetryable(false);
      return;
    }
    if (contentPoints.trim().length < 10) {
      setError('本文の要点は10文字以上入力してください');
      setIsErrorRetryable(false);
      return;
    }

    setIsGeneratingTitles(true);
    clearError();

    try {
      const response = await withRetry(
        () => articleApi.generateTitles({
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
      setCurrentStep('title-selection');
    } catch (err) {
      logError(err, 'handleGenerateTitles');
      setError(getErrorMessage(err));
      setIsErrorRetryable(isRetryableError(err));
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // ジョブステータスに応じたメッセージを返す
  const getStatusMessage = (status: JobStatus): string => {
    switch (status) {
      case 'pending':
        return 'ジョブを準備中...';
      case 'processing':
        return 'AIが記事を執筆中...';
      case 'completed':
        return '生成完了！';
      case 'failed':
        return '生成に失敗しました';
      default:
        return '処理中...';
    }
  };

  // タイトルを選択して記事生成
  const selectTitleAndGenerate = async (title: string) => {
    setSelectedTitle(title);
    setCurrentStep('generating');
    setGenerationProgress(0);
    setGenerationStatus('ジョブを投入中...');
    clearError();

    try {
      const request: GenerateArticleRequest = {
        title,
        targetAudience: targetAudience || undefined,
        purpose: purpose || undefined,
        keywords: keywords.split(/[,、\s]+/).filter(Boolean),
        contentPoints,
        wordCount,
        articleType,
        internalLinks: internalLinks.filter((link) => link.url && link.title),
        outputFormat,
      };

      // 非同期ポーリングで記事生成（進捗コールバック付き）
      const response = await articleApi.generate(request, (status, progress) => {
        setGenerationStatus(getStatusMessage(status));
        if (progress !== undefined) {
          setGenerationProgress(progress);
        } else {
          // progressが未定義の場合、ステータスに応じた概算を設定
          switch (status) {
            case 'pending':
              setGenerationProgress(10);
              break;
            case 'processing':
              setGenerationProgress((prev) => Math.min(prev + 5, 85));
              break;
          }
        }
      });

      setGenerationStatus('生成完了！');
      setGenerationProgress(100);
      setRetryCount(0);

      // 生成された記事をlocalStorageに保存
      let savedArticle;
      if (outputFormat === 'markdown') {
        // Markdown: そのまま保存
        savedArticle = createMarkdownArticle(response.markdown, response.title);
      } else {
        // WordPress: ブロック形式に変換して保存
        initializeBlocks();
        const blocks = parse(response.markdown);
        savedArticle = createArticle(blocks, response.title, outputFormat);
      }

      setCurrentStep('complete');

      // 記事編集ページへ遷移
      setTimeout(() => {
        navigate(`/editor?id=${savedArticle.id}`);
      }, 1500);
    } catch (err) {
      logError(err, 'selectTitleAndGenerate');
      setError(getErrorMessage(err));
      setIsErrorRetryable(isRetryableError(err));
      setCurrentStep('title-selection');
    }
  };

  // リトライハンドラー
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      if (selectedTitle) {
        selectTitleAndGenerate(selectedTitle);
      } else {
        handleGenerateTitles();
      }
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">記事を生成</h1>
          <p className="text-gray-600">
            {currentStep === 'input' && '記事の内容を入力してください'}
            {currentStep === 'title-selection' && 'タイトルを選択してください'}
            {currentStep === 'generating' && '記事を生成しています...'}
            {currentStep === 'complete' && '記事の生成が完了しました！'}
          </p>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep === 'input' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
            }`}>
              1
            </div>
            <div className={`w-24 h-1 ${currentStep !== 'input' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep === 'title-selection' ? 'bg-blue-600 text-white' :
              currentStep === 'generating' || currentStep === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              2
            </div>
            <div className={`w-24 h-1 ${currentStep === 'generating' || currentStep === 'complete' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep === 'generating' ? 'bg-blue-600 text-white' :
              currentStep === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <span className="text-red-500 mr-2">!</span>
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

        {/* 戻る確認ダイアログ */}
        {showBackConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                入力画面に戻りますか？
              </h3>
              <p className="text-gray-600 mb-6">
                タイトル候補は保持されません。入力内容は維持されます。
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowBackConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmBack}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  戻る
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ステップ1: 入力フォーム */}
        {currentStep === 'input' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
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

            {/* 出力形式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">出力形式</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {outputFormats.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setOutputFormat(format.value)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      outputFormat === format.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <p className="font-medium">{format.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{format.description}</p>
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
                placeholder="記事に含めたい内容、ポイント、構成案などを入力してください（10文字以上）"
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

            {/* 内部リンク */}
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

            {/* タイトル提案ボタン */}
            <div className="pt-4 border-t">
              <button
                onClick={handleGenerateTitles}
                disabled={isGeneratingTitles || !contentPoints.trim() || contentPoints.trim().length < 10}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGeneratingTitles ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    タイトルを生成中...
                  </>
                ) : (
                  'タイトルを提案してもらう'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ステップ2: タイトル選択 */}
        {currentStep === 'title-selection' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">タイトルを選択</h2>
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </button>
            </div>
            <div className="space-y-4">
              {titleSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectTitleAndGenerate(suggestion.title)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <p className="font-medium text-gray-900 mb-1">{suggestion.title}</p>
                  <p className="text-sm text-gray-600">{suggestion.reason}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">選択した出力形式:</span>{' '}
                {outputFormats.find(f => f.value === outputFormat)?.label}
              </p>
            </div>
          </div>
        )}

        {/* ステップ3: 生成中 */}
        {(currentStep === 'generating' || currentStep === 'complete') && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">{generationStatus}</h2>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              {currentStep === 'generating' ? (
                <p className="text-gray-600">
                  AIが記事を生成しています。しばらくお待ちください...
                </p>
              ) : (
                <div className="text-green-600 flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  エディタ画面に移動します...
                </div>
              )}
            </div>
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">タイトル:</span> {selectedTitle}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">出力形式:</span>{' '}
                {outputFormats.find(f => f.value === outputFormat)?.label}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneratePage;
