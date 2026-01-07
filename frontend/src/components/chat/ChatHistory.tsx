/**
 * 会話履歴コンポーネント
 * Phase 3: チャット修正の実装
 */

import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../services/chatEditApi';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  isLoading?: boolean;
  loadingMessage?: string;
}

export function ChatHistory({
  messages,
  isLoading = false,
  loadingMessage = '編集中...',
}: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // メッセージがない場合
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">チャットで記事を編集</p>
          <p className="text-sm">
            編集したい内容を自然な言葉で指示してください
          </p>
          <div className="mt-4 text-sm text-gray-400">
            <p>例：</p>
            <ul className="mt-2 space-y-1">
              <li>「導入部分をもっと魅力的にして」</li>
              <li>「3番目の見出しを具体例付きで書き直して」</li>
              <li>「全体的にもう少しカジュアルなトーンにして」</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* メッセージ一覧 */}
      {messages.map((message) => (
        <ChatMessage key={message.messageId} message={message} />
      ))}

      {/* ローディング表示 */}
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-gray-100 rounded-r-lg rounded-tl-lg px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-gray-500">{loadingMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* スクロール用の参照点 */}
      <div ref={bottomRef} />
    </div>
  );
}

export default ChatHistory;
