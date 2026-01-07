/**
 * チャットメッセージコンポーネント
 * Phase 3: チャット修正の実装
 */

import type { ChatMessage as ChatMessageType } from '../../services/chatEditApi';

interface ChatMessageProps {
  message: ChatMessageType;
  showAction?: boolean;
}

export function ChatMessage({ message, showAction = true }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp * 1000);
  const timeStr = timestamp.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // アクションラベル
  const actionLabels: Record<string, { label: string; color: string }> = {
    edit: { label: '編集', color: 'bg-green-100 text-green-700' },
    append: { label: '追加', color: 'bg-blue-100 text-blue-700' },
    replace_section: { label: 'セクション置換', color: 'bg-purple-100 text-purple-700' },
    no_change: { label: '変更なし', color: 'bg-gray-100 text-gray-700' },
    undo: { label: '取り消し', color: 'bg-orange-100 text-orange-700' },
  };

  const action = message.action ? actionLabels[message.action] : null;

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-blue-600 text-white rounded-l-lg rounded-tr-lg'
            : 'bg-gray-100 text-gray-800 rounded-r-lg rounded-tl-lg'
        } px-4 py-3 shadow-sm`}
      >
        {/* メッセージ内容 */}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {/* フッター：時刻とアクション */}
        <div
          className={`flex items-center justify-between mt-2 text-xs ${
            isUser ? 'text-blue-200' : 'text-gray-500'
          }`}
        >
          <span>{timeStr}</span>

          {/* アクションバッジ（アシスタントのみ） */}
          {showAction && action && !isUser && (
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${action.color}`}
            >
              {action.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
