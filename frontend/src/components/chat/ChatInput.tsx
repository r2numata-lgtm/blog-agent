/**
 * チャット入力コンポーネント
 * Phase 3: チャット修正の実装
 */

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedText?: string;
  onClearSelection?: () => void;
}

export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = '編集指示を入力してください...',
  selectedText,
  onClearSelection,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  // 送信処理
  const handleSubmit = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSubmit(trimmedMessage);
    setMessage('');

    // 高さをリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, disabled, onSubmit]);

  // キーボードイベント
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter で送信
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // クイック編集コマンド
  const quickCommands = [
    { label: 'もっと詳しく', command: 'もっと詳しく説明してください' },
    { label: '簡潔に', command: 'もっと簡潔にまとめてください' },
    { label: '例を追加', command: '具体例を追加してください' },
    { label: 'トーンを変更', command: 'もう少しカジュアルなトーンにしてください' },
  ];

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* 選択テキスト表示 */}
      {selectedText && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">選択中のテキスト</span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              選択解除
            </button>
          </div>
          <p className="text-sm text-gray-700 line-clamp-3">{selectedText}</p>
        </div>
      )}

      {/* クイックコマンド */}
      <div className="flex flex-wrap gap-2 mb-3">
        {quickCommands.map((cmd) => (
          <button
            key={cmd.label}
            type="button"
            onClick={() => setMessage(cmd.command)}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* 入力エリア */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {message.length}/2000
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          <span className="hidden sm:inline">送信</span>
        </button>
      </div>

      {/* ヒント */}
      <p className="mt-2 text-xs text-gray-500">
        Ctrl + Enter で送信 | テキストを選択して部分的な編集も可能
      </p>
    </div>
  );
}

export default ChatInput;
