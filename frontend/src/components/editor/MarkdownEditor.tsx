/**
 * MarkdownEditor - Markdownエディタコンポーネント
 * シンタックスハイライト機能付き
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// シンタックスハイライト用のトークン定義
interface Token {
  type: string;
  regex: RegExp;
  className: string;
}

const TOKENS: Token[] = [
  { type: 'heading', regex: /^(#{1,6})\s+(.*)$/gm, className: 'text-blue-600 font-bold' },
  { type: 'bold', regex: /\*\*([^*]+)\*\*/g, className: 'text-orange-600 font-bold' },
  { type: 'italic', regex: /\*([^*]+)\*/g, className: 'text-purple-600 italic' },
  { type: 'link', regex: /\[([^\]]+)\]\(([^)]+)\)/g, className: 'text-green-600 underline' },
  { type: 'code', regex: /`([^`]+)`/g, className: 'bg-gray-200 text-red-600 px-1 rounded' },
  { type: 'blockquote', regex: /^>\s+(.*)$/gm, className: 'text-gray-500 border-l-4 border-gray-300 pl-2' },
  { type: 'list', regex: /^[-*]\s+(.*)$/gm, className: 'text-cyan-600' },
  { type: 'orderedList', regex: /^\d+\.\s+(.*)$/gm, className: 'text-cyan-600' },
  { type: 'emoji', regex: /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/gu, className: '' },
];

/**
 * MarkdownEditor コンポーネント
 */
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, className = '' }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // スクロール同期
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setScrollTop(target.scrollTop);
    if (highlightRef.current) {
      highlightRef.current.scrollTop = target.scrollTop;
    }
  }, []);

  // キーボードショートカット
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    // Ctrl/Cmd + B: 太字
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      const newText = selectedText ? `**${selectedText}**` : '**テキスト**';
      const newValue = value.substring(0, start) + newText + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = selectedText ? start : start + 2;
        textarea.selectionEnd = selectedText ? start + newText.length : start + 6;
      }, 0);
    }

    // Ctrl/Cmd + I: 斜体
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      const newText = selectedText ? `*${selectedText}*` : '*テキスト*';
      const newValue = value.substring(0, start) + newText + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = selectedText ? start : start + 1;
        textarea.selectionEnd = selectedText ? start + newText.length : start + 5;
      }, 0);
    }

    // Tab: インデント
    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, [value, onChange]);

  // シンタックスハイライト適用
  const highlightedContent = useCallback((content: string): string => {
    let result = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 見出し
    result = result.replace(/^(#{1,6})\s+(.*)$/gm, '<span class="text-blue-600 font-bold">$1 $2</span>');

    // コードブロック（先に処理）
    result = result.replace(/```(\w*)\n([\s\S]*?)```/g, '<span class="bg-gray-800 text-green-400 block p-2 rounded my-1">```$1\n$2```</span>');

    // インラインコード
    result = result.replace(/`([^`]+)`/g, '<span class="bg-gray-200 text-red-600 px-1 rounded">$&</span>');

    // 太字
    result = result.replace(/\*\*([^*]+)\*\*/g, '<span class="text-orange-600 font-bold">$&</span>');

    // 斜体
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<span class="text-purple-600 italic">$&</span>');

    // リンク
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="text-green-600 underline">$&</span>');

    // 引用
    result = result.replace(/^&gt;\s+(.*)$/gm, '<span class="text-gray-500 italic">$&</span>');

    // リスト
    result = result.replace(/^([-*])\s+(.*)$/gm, '<span class="text-cyan-600">$1 $2</span>');
    result = result.replace(/^(\d+\.)\s+(.*)$/gm, '<span class="text-cyan-600">$1 $2</span>');

    return result;
  }, []);

  return (
    <div className={`relative h-full ${className}`}>
      {/* ハイライト表示レイヤー */}
      <div
        ref={highlightRef}
        className="absolute inset-0 p-4 font-mono text-sm bg-gray-900 text-gray-100 overflow-hidden whitespace-pre-wrap break-words pointer-events-none"
        style={{ scrollTop }}
        dangerouslySetInnerHTML={{ __html: highlightedContent(value) + '\n' }}
      />

      {/* テキストエリア（透明） */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-transparent text-transparent caret-white resize-none focus:outline-none"
        spellCheck={false}
        placeholder="Markdownを入力..."
      />

      {/* ツールバー */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = value.substring(start, end);
            const newText = selectedText ? `**${selectedText}**` : '**テキスト**';
            onChange(value.substring(0, start) + newText + value.substring(end));
          }}
          className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600"
          title="太字 (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = value.substring(start, end);
            const newText = selectedText ? `*${selectedText}*` : '*テキスト*';
            onChange(value.substring(0, start) + newText + value.substring(end));
          }}
          className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 italic"
          title="斜体 (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const pos = textarea.selectionStart;
            onChange(value.substring(0, pos) + '\n## ' + value.substring(pos));
          }}
          className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600"
          title="見出し"
        >
          H
        </button>
        <button
          onClick={() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = value.substring(start, end);
            const newText = selectedText ? `[${selectedText}](URL)` : '[リンクテキスト](URL)';
            onChange(value.substring(0, start) + newText + value.substring(end));
          }}
          className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600"
          title="リンク"
        >
          🔗
        </button>
        <button
          onClick={() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const pos = textarea.selectionStart;
            onChange(value.substring(0, pos) + '\n> ' + value.substring(pos));
          }}
          className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600"
          title="引用"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default MarkdownEditor;
