/**
 * EditorPage - 記事エディタページ
 * WordPress: コードエディタ / プレビュー（2タブ）
 * Markdown: Markdownエディタ / プレビュー（2タブ）
 * チャット修正機能付き
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { serialize, parse } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';
import { registerCustomBlocks } from '../../utils/customBlocks';
import { MarkdownEditor } from '../../components/editor';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  updateArticle,
  getArticle,
  getArticleBlocks,
  type OutputFormat,
  type SavedArticle,
} from '../../services/articleStorage';
import { getAllDecorationCSS } from '../../services/decorationService';



// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockInstance = any;

// ブロックの登録状態（グローバルで管理してHMRでも重複登録を防ぐ）
const BLOCKS_INITIALIZED_KEY = '__ba_blocks_initialized__';

function initializeBlocks(): void {
  // windowオブジェクトでグローバルに管理（HMR対応）
  if ((window as unknown as Record<string, unknown>)[BLOCKS_INITIALIZED_KEY]) return;

  try {
    registerCoreBlocks();
    registerCustomBlocks();
    (window as unknown as Record<string, unknown>)[BLOCKS_INITIALIZED_KEY] = true;
  } catch (e) {
    // 既に登録済みの場合は警告を無視
    if (!(e instanceof Error) || !e.message.includes('already registered')) {
      console.error('Failed to initialize blocks:', e);
    }
    (window as unknown as Record<string, unknown>)[BLOCKS_INITIALIZED_KEY] = true;
  }
}

// タブの型定義
type WordPressTab = 'code' | 'preview';
type MarkdownTab = 'edit' | 'preview';

// 出力形式のラベル
const formatLabels: Record<OutputFormat, string> = {
  wordpress: 'WordPress',
  markdown: 'Markdown',
};

/**
 * EditorPage コンポーネント
 */
const EditorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ブロック初期化
  useEffect(() => {
    initializeBlocks();
  }, []);

  // 記事データ
  const [article, setArticle] = useState<SavedArticle | null>(null);
  const [blocks, setBlocks] = useState<BlockInstance[]>([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');

  // UI状態
  const [wpTab, setWpTab] = useState<WordPressTab>('code');
  const [mdTab, setMdTab] = useState<MarkdownTab>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [decorationCSS, setDecorationCSS] = useState('');

  // チャット状態
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);


  // 装飾CSSを読み込み
  useEffect(() => {
    setDecorationCSS(getAllDecorationCSS());
  }, []);

  // 記事の読み込み
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      const loadedArticle = getArticle(id);
      if (loadedArticle) {
        setArticle(loadedArticle);

        if (loadedArticle.outputFormat === 'wordpress') {
          const loadedBlocks = getArticleBlocks(id);
          if (loadedBlocks) {
            setBlocks(loadedBlocks);
            setHtmlContent(serialize(loadedBlocks));
          }
        } else if (loadedArticle.outputFormat === 'markdown') {
          // Markdown記事の場合はcontentをMarkdownとして扱う
          // （保存時にHTML→Markdown変換している場合の対応）
          const content = loadedArticle.content;
          // HTMLコメントを除去してMarkdownとして表示
          const cleanContent = content
            .replace(/<!-- wp:[^>]+ -->/g, '')
            .replace(/<!-- \/wp:[^>]+ -->/g, '')
            .replace(/<[^>]+>/g, (match) => {
              // 基本的なHTML→Markdown変換
              if (match.match(/<h2[^>]*>/)) return '## ';
              if (match.match(/<h3[^>]*>/)) return '### ';
              if (match.match(/<\/h[23]>/)) return '\n\n';
              if (match.match(/<p[^>]*>/)) return '';
              if (match.match(/<\/p>/)) return '\n\n';
              if (match.match(/<strong>/)) return '**';
              if (match.match(/<\/strong>/)) return '**';
              if (match.match(/<em>/)) return '*';
              if (match.match(/<\/em>/)) return '*';
              if (match.match(/<ul[^>]*>/)) return '';
              if (match.match(/<\/ul>/)) return '\n';
              if (match.match(/<li[^>]*>/)) return '- ';
              if (match.match(/<\/li>/)) return '\n';
              return '';
            })
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          setMarkdownContent(cleanContent || content);
        }
      }
    } else {
      navigate('/articles');
    }
  }, [searchParams, navigate]);

  // HTMLコード変更ハンドラ
  const handleHtmlChange = useCallback((html: string) => {
    setHtmlContent(html);
  }, []);

  // タブ切り替え
  const handleWpTabChange = useCallback((newTab: WordPressTab) => {
    setWpTab(newTab);
  }, []);

  // 保存処理
  const handleSave = useCallback(async () => {
    if (!article) return;
    setIsSaving(true);
    try {
      let updated;
      if (article.outputFormat === 'wordpress') {
        updated = updateArticle(article.id, blocks, article.title);
      } else {
        // Markdown: markdownContentをHTMLに変換して保存（内部的にはブロック形式）
        const htmlFromMd = marked(markdownContent) as string;
        const tempBlocks = parse(`<!-- wp:html -->${htmlFromMd}<!-- /wp:html -->`);
        updated = updateArticle(article.id, tempBlocks.length > 0 ? tempBlocks : blocks, article.title);
      }
      if (updated) {
        setArticle(updated);
      }
      setLastSaved(new Date());
    } catch (e) {
      console.error('Failed to save:', e);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [blocks, article, markdownContent]);

  // 自動保存（30秒ごと）
  useEffect(() => {
    const timer = setInterval(() => {
      if (article) {
        handleSave();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [article, handleSave]);

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

  // コードをコピー
  const handleCopyCode = useCallback(() => {
    const content = article?.outputFormat === 'wordpress' ? htmlContent : markdownContent;
    navigator.clipboard.writeText(content);
    alert('コードをクリップボードにコピーしました');
  }, [article, htmlContent, markdownContent]);

  // エクスポート
  const handleExport = useCallback(() => {
    if (!article) return;
    const content = article.outputFormat === 'wordpress' ? htmlContent : markdownContent;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = article.outputFormat === 'wordpress' ? 'html' : 'md';
    a.download = `${article.title}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [article, htmlContent, markdownContent]);

  // チャット送信
  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      // TODO: バックエンドAPIに接続
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockResponse = `了解しました。「${userMessage}」に基づいて記事を修正します。\n\n修正が完了しました。変更内容を確認してください。`;
      setChatMessages(prev => [...prev, { role: 'assistant', content: mockResponse }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。再度お試しください。' }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading]);

  // チャットスクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Markdownプレビュー生成
  const markdownPreviewHtml = useCallback(() => {
    // markedオプションを設定
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // 改行を<br>に変換
    });
    const rawHtml = marked(markdownContent) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [markdownContent]);

  if (!article) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">記事を読み込み中...</p>
        </div>
      </div>
    );
  }

  const isWordPress = article.outputFormat === 'wordpress';
  const isMarkdown = article.outputFormat === 'markdown';

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* 装飾CSS（プレビュー用） */}
      <style dangerouslySetInnerHTML={{ __html: decorationCSS }} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/articles')}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
            {article.title}
          </h1>
          <span className={`px-2 py-1 text-xs rounded ${
            isWordPress ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
          }`}>
            {formatLabels[article.outputFormat]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              最終保存: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            コピー
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            エクスポート
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-3 py-1.5 text-sm border rounded flex items-center gap-1 ${showChat ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            AI修正
          </button>
        </div>
      </div>

      {/* WordPress用タブ */}
      {isWordPress && (
        <div className="flex border-b bg-white">
          <button
            onClick={() => handleWpTabChange('code')}
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
              wpTab === 'code'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            コード
          </button>
          <button
            onClick={() => handleWpTabChange('preview')}
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
              wpTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            プレビュー
          </button>
        </div>
      )}

      {/* Markdown用タブ */}
      {isMarkdown && (
        <div className="flex border-b bg-white">
          <button
            onClick={() => setMdTab('edit')}
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
              mdTab === 'edit'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            エディタ
          </button>
          <button
            onClick={() => setMdTab('preview')}
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
              mdTab === 'preview'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            プレビュー
          </button>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* エディタエリア */}
        <div className={`flex-1 overflow-hidden ${showChat ? 'border-r' : ''}`}>
          {/* WordPress: コードエディタ */}
          {isWordPress && wpTab === 'code' && (
            <div className="h-full">
              <textarea
                value={htmlContent}
                onChange={(e) => handleHtmlChange(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
                spellCheck={false}
                placeholder="HTMLコードを入力..."
              />
            </div>
          )}

          {/* WordPress: プレビュー */}
          {isWordPress && wpTab === 'preview' && (
            <div className="h-full overflow-y-auto p-8 bg-gray-100">
              <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
                <article className="ba-article">
                  <h1 className="text-3xl font-bold mb-6">{article.title}</h1>
                  <div dangerouslySetInnerHTML={{
                    __html: htmlContent
                      .replace(/<!-- wp:[^>]+ -->/g, '')
                      .replace(/<!-- \/wp:[^>]+ -->/g, '')
                  }} />
                </article>
              </div>
            </div>
          )}

          {/* Markdown: エディタ */}
          {isMarkdown && mdTab === 'edit' && (
            <MarkdownEditor
              value={markdownContent}
              onChange={setMarkdownContent}
              className="h-full"
            />
          )}

          {/* Markdown: プレビュー */}
          {isMarkdown && mdTab === 'preview' && (
            <div className="h-full overflow-y-auto p-8 bg-gray-100">
              <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
                <article className="ba-article">
                  <h1 className="text-3xl font-bold mb-6">{article.title}</h1>
                  <div dangerouslySetInnerHTML={{ __html: markdownPreviewHtml() }} />
                </article>
              </div>
            </div>
          )}
        </div>

        {/* チャットパネル */}
        {showChat && (
          <div className="w-96 flex flex-col bg-white">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">AI修正アシスタント</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="mb-2">AIに修正を指示できます</p>
                  <p className="text-sm">例: 「導入部分をもっと魅力的にして」</p>
                </div>
              )}
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                  placeholder="修正指示を入力..."
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendChat}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  送信
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPage;
