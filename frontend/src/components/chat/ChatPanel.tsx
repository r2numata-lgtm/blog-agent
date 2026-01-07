/**
 * チャットパネルコンポーネント
 * Phase 3: チャット修正の実装
 *
 * チャット入力、会話履歴、リビジョン一覧を統合したパネル
 */

import { useState, useCallback, useEffect } from 'react';
import { ChatInput } from './ChatInput';
import { ChatHistory } from './ChatHistory';
import { RevisionList } from './RevisionList';
import { DiffViewer, SideBySideDiff } from './DiffViewer';
import { chatEditApi, type ChatMessage, type Revision, type ChatEditResponse } from '../../services/chatEditApi';

type TabType = 'chat' | 'history' | 'diff';

interface ChatPanelProps {
  articleId: string;
  currentContent: string;
  onContentUpdate: (newContent: string) => void;
  selectedText?: string;
  onClearSelection?: () => void;
}

export function ChatPanel({
  articleId,
  currentContent,
  onContentUpdate,
  selectedText,
  onClearSelection,
}: ChatPanelProps) {
  // 状態
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [lastEdit, setLastEdit] = useState<ChatEditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 会話履歴を読み込み
  const loadHistory = useCallback(async () => {
    if (!articleId) return;

    try {
      const history = await chatEditApi.getHistory(articleId);
      setMessages(history.messages || []);
      setRevisions(history.revisions || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [articleId]);

  // 初期読み込み
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 編集メッセージを送信
  const handleSubmit = useCallback(
    async (instruction: string) => {
      if (!instruction.trim()) return;

      setIsLoading(true);
      setError(null);

      // ユーザーメッセージを即座に表示
      const userMessage: ChatMessage = {
        messageId: `temp_${Date.now()}`,
        role: 'user',
        content: instruction,
        timestamp: Math.floor(Date.now() / 1000),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await chatEditApi.edit({
          instruction,
          articleId,
          currentContent,
          selectedText,
        });

        // アシスタントメッセージを追加
        const assistantMessage: ChatMessage = {
          messageId: `temp_${Date.now()}_assistant`,
          role: 'assistant',
          content: response.explanation,
          timestamp: Math.floor(Date.now() / 1000),
          action: response.action,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // 変更があれば適用
        if (response.action !== 'no_change' && response.newContent) {
          onContentUpdate(response.newContent);
          setLastEdit(response);

          // リビジョンを追加
          if (response.revisionId && response.diff) {
            const newRevision: Revision = {
              revisionId: response.revisionId,
              timestamp: Math.floor(Date.now() / 1000),
              instruction,
              action: response.action,
              explanation: response.explanation,
              originalContent: response.originalContent,
              newContent: response.newContent,
              diff: response.diff,
            };
            setRevisions((prev) => [...prev, newRevision]);
          }
        }

        // 選択解除
        onClearSelection?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '編集に失敗しました';
        setError(errorMessage);

        // エラーメッセージを表示
        const errorAssistantMessage: ChatMessage = {
          messageId: `temp_${Date.now()}_error`,
          role: 'assistant',
          content: `エラー: ${errorMessage}`,
          timestamp: Math.floor(Date.now() / 1000),
        };
        setMessages((prev) => [...prev, errorAssistantMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [articleId, currentContent, selectedText, onContentUpdate, onClearSelection]
  );

  // リビジョンを元に戻す
  const handleRevert = useCallback(
    async (revisionId: string) => {
      setIsReverting(true);
      setError(null);

      try {
        const response = await chatEditApi.revert({
          articleId,
          revisionId,
        });

        if (response.success) {
          onContentUpdate(response.content);
          await loadHistory(); // 履歴を再読み込み
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '元に戻すのに失敗しました';
        setError(errorMessage);
      } finally {
        setIsReverting(false);
      }
    },
    [articleId, onContentUpdate, loadHistory]
  );

  // タブの内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <>
            <ChatHistory
              messages={messages}
              isLoading={isLoading}
              loadingMessage="AIが編集中..."
            />
            <ChatInput
              onSubmit={handleSubmit}
              disabled={isLoading}
              selectedText={selectedText}
              onClearSelection={onClearSelection}
            />
          </>
        );

      case 'history':
        return (
          <div className="flex-1 overflow-y-auto">
            <RevisionList
              revisions={revisions}
              onRevert={handleRevert}
              isReverting={isReverting}
            />
          </div>
        );

      case 'diff':
        return (
          <div className="flex-1 overflow-y-auto p-4">
            {lastEdit && lastEdit.action !== 'no_change' ? (
              <>
                {lastEdit.diff ? (
                  <DiffViewer diff={lastEdit.diff} />
                ) : lastEdit.originalContent && lastEdit.newContent ? (
                  <SideBySideDiff
                    originalContent={lastEdit.originalContent}
                    newContent={lastEdit.newContent}
                  />
                ) : (
                  <p className="text-gray-500 text-center">差分情報がありません</p>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>まだ編集が行われていません</p>
                <p className="text-sm mt-1">チャットで編集指示を送信してください</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            チャット
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            履歴
            {revisions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 rounded-full">
                {revisions.length}
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('diff')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'diff'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            差分
          </span>
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* タブ内容 */}
      {renderTabContent()}
    </div>
  );
}

export default ChatPanel;
