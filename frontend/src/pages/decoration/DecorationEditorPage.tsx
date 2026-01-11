/**
 * DecorationEditorPage - 装飾CSSエディタページ
 * 個別の装飾CSSを編集できる画面
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getDecoration,
  saveCustomCSS,
  resetToDefault,
  type Decoration,
} from '../../services/decorationService';

/**
 * DecorationEditorPage コンポーネント
 */
const DecorationEditorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 装飾データ
  const [decoration, setDecoration] = useState<Decoration | null>(null);
  const [cssValue, setCssValue] = useState('');
  const [originalCss, setOriginalCss] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // UI状態
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 装飾の読み込み
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      const loadedDecoration = getDecoration(id);
      if (loadedDecoration) {
        setDecoration(loadedDecoration);
        const css = loadedDecoration.customCSS || loadedDecoration.defaultCSS;
        setCssValue(css);
        setOriginalCss(css);
      } else {
        navigate('/article-settings');
      }
    } else {
      navigate('/article-settings');
    }
  }, [searchParams, navigate]);

  // 変更検知
  useEffect(() => {
    setHasChanges(cssValue !== originalCss);
  }, [cssValue, originalCss]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!decoration) return;
    setIsSaving(true);

    try {
      const updated = saveCustomCSS(decoration.id, cssValue);
      if (updated) {
        setDecoration(updated);
        setOriginalCss(cssValue);
        setHasChanges(false);
      }
    } catch (e) {
      console.error('Failed to save CSS:', e);
      alert('CSSの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [decoration, cssValue]);

  // 標準に戻す
  const handleReset = useCallback(() => {
    if (!decoration) return;

    const updated = resetToDefault(decoration.id);
    if (updated) {
      setDecoration(updated);
      setCssValue(updated.defaultCSS);
      setOriginalCss(updated.defaultCSS);
      setHasChanges(false);
    }
    setShowResetConfirm(false);
  }, [decoration]);

  // キャンセル
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      if (confirm('変更を破棄しますか？')) {
        navigate('/article-settings');
      }
    } else {
      navigate('/article-settings');
    }
  }, [hasChanges, navigate]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // サンプルHTML生成
  const getSampleHtml = useCallback((): string => {
    if (!decoration) return '';

    const sampleContent: Record<string, string> = {
      'ba-highlight': '<p>これは<span class="ba-highlight">ハイライトされたテキスト</span>の例です。重要な部分を強調するために使用します。</p>',
      'ba-point': '<div class="ba-point"><p>これはポイントボックスの内容です。読者に伝えたい重要な情報をここに記載します。</p></div>',
      'ba-warning': '<div class="ba-warning"><p>これは警告ボックスの内容です。注意事項や重要な注意点を記載します。</p></div>',
      'ba-success': '<div class="ba-success"><p>これは成功ボックスの内容です。おすすめ情報や成功事例を記載します。</p></div>',
      'ba-quote': '<div class="ba-quote"><p>これは引用ボックスの内容です。重要な引用文や参考情報を記載します。</p></div>',
      'ba-summary': '<div class="ba-summary"><p>これはまとめボックスの内容です。</p><ul><li>ポイント1</li><li>ポイント2</li><li>ポイント3</li></ul></div>',
      'ba-checklist': '<div class="ba-checklist"><ul><li>チェック項目1</li><li>チェック項目2</li><li>チェック項目3</li></ul></div>',
      'ba-number-list': '<div class="ba-number-list"><ol><li>ステップ1の説明</li><li>ステップ2の説明</li><li>ステップ3の説明</li></ol></div>',
    };

    return sampleContent[decoration.id] || `<div class="${decoration.id}">サンプルコンテンツ</div>`;
  }, [decoration]);

  if (!decoration) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {decoration.displayName}の編集
          </h1>
          {decoration.isCustomized && (
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
              カスタム
            </span>
          )}
          {hasChanges && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
              未保存の変更
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {decoration.isCustomized && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded hover:bg-orange-50"
            >
              標準に戻す
            </button>
          )}
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* CSSエディタ */}
        <div className="flex-1 flex flex-col border-r">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold text-sm">CSSエディタ</h2>
            <p className="text-xs text-gray-500 mt-1">
              クラス名: <code className="bg-gray-200 px-1 rounded">.{decoration.id}</code>
            </p>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={cssValue}
              onChange={(e) => setCssValue(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
              spellCheck={false}
              placeholder="CSSを入力..."
            />
          </div>
        </div>

        {/* プレビュー */}
        <div className="w-1/2 flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold text-sm">リアルタイムプレビュー</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
            <div className="bg-white p-6 rounded-lg shadow max-w-xl mx-auto">
              <style dangerouslySetInnerHTML={{ __html: cssValue }} />
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: getSampleHtml() }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 標準に戻す確認モーダル */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">標準CSSに戻す</h3>
            <p className="text-gray-600 mb-4">
              カスタムCSSを削除し、標準CSSに戻します。この操作は元に戻せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                標準に戻す
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecorationEditorPage;
