/**
 * チャット修正APIサービス
 * Phase 3: チャット修正の実装
 */

import { api } from './api';

// 差分の型定義
export interface DiffEntry {
  type: 'insert' | 'delete' | 'replace' | 'equal';
  old_line?: number;
  new_line?: number;
  old_text?: string;
  new_text?: string;
  old_line_count?: number;
  new_line_count?: number;
}

// リビジョンの型定義
export interface Revision {
  revisionId: string;
  timestamp: number;
  instruction: string;
  action: 'edit' | 'append' | 'replace_section' | 'no_change' | 'undo';
  explanation: string;
  originalContent?: string;
  newContent?: string;
  diff?: {
    instruction: string;
    edit_type: string;
    diffs: DiffEntry[];
    diff_count: number;
    original_length: number;
    new_length: number;
    length_change: number;
  };
}

// メッセージの型定義
export interface ChatMessage {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  action?: string;
}

// 会話履歴の型定義
export interface ConversationHistory {
  conversationId: string | null;
  messages: ChatMessage[];
  revisions: Revision[];
  createdAt?: number;
  updatedAt?: number;
}

// チャット編集リクエストの型定義
export interface ChatEditRequest {
  instruction: string;
  articleId?: string;
  currentContent?: string;
  selectedText?: string;
  selectionContext?: string;
}

// チャット編集レスポンスの型定義
export interface ChatEditResponse {
  action: 'edit' | 'append' | 'replace_section' | 'no_change' | 'undo';
  explanation: string;
  originalContent?: string;
  newContent?: string;
  diff?: Revision['diff'];
  revisionId?: string;
  conversationId: string;
  metadata: {
    generationTime: number;
    inputTokens: number;
    outputTokens: number;
  };
}

// リバートリクエストの型定義
export interface RevertRequest {
  articleId: string;
  revisionId: string;
}

// リバートレスポンスの型定義
export interface RevertResponse {
  success: boolean;
  revertedRevisionId: string;
  newRevisionId: string;
  content: string;
}

/**
 * チャット編集APIサービス
 */
export const chatEditApi = {
  /**
   * チャットで記事を編集
   * @param request 編集リクエスト
   * @returns 編集結果
   */
  edit: async (request: ChatEditRequest): Promise<ChatEditResponse> => {
    return api.post<ChatEditResponse>('/chat/edit', request);
  },

  /**
   * 会話履歴を取得
   * @param articleId 記事ID
   * @returns 会話履歴
   */
  getHistory: async (articleId: string): Promise<ConversationHistory> => {
    return api.get<ConversationHistory>(`/chat/history/${articleId}`);
  },

  /**
   * リビジョンを元に戻す
   * @param request リバートリクエスト
   * @returns リバート結果
   */
  revert: async (request: RevertRequest): Promise<RevertResponse> => {
    return api.post<RevertResponse>('/chat/revert', request);
  },

  /**
   * 記事のリビジョン一覧を取得
   * @param articleId 記事ID
   * @returns リビジョン一覧
   */
  getRevisions: async (articleId: string): Promise<Revision[]> => {
    const history = await chatEditApi.getHistory(articleId);
    return history.revisions;
  },

  /**
   * 特定のリビジョンの詳細を取得
   * @param articleId 記事ID
   * @param revisionId リビジョンID
   * @returns リビジョン詳細
   */
  getRevision: async (articleId: string, revisionId: string): Promise<Revision | null> => {
    const revisions = await chatEditApi.getRevisions(articleId);
    return revisions.find(r => r.revisionId === revisionId) || null;
  },
};

/**
 * 差分を人間が読みやすい形式に変換
 * @param diffs 差分エントリのリスト
 * @returns フォーマットされた差分テキスト
 */
export function formatDiffForDisplay(diffs: DiffEntry[]): string {
  const lines: string[] = [];

  for (const diff of diffs) {
    switch (diff.type) {
      case 'insert':
        lines.push(`+ ${diff.new_text}`);
        break;
      case 'delete':
        lines.push(`- ${diff.old_text}`);
        break;
      case 'replace':
        lines.push(`- ${diff.old_text}`);
        lines.push(`+ ${diff.new_text}`);
        break;
    }
  }

  return lines.join('\n');
}

/**
 * リビジョンの要約を生成
 * @param revision リビジョン
 * @returns 要約テキスト
 */
export function summarizeRevision(revision: Revision): string {
  const actionLabels: Record<string, string> = {
    edit: '編集',
    append: '追加',
    replace_section: 'セクション置換',
    no_change: '変更なし',
    undo: '取り消し',
  };

  const actionLabel = actionLabels[revision.action] || revision.action;
  const date = new Date(revision.timestamp * 1000);
  const dateStr = date.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `[${dateStr}] ${actionLabel}: ${revision.explanation}`;
}

/**
 * 差分統計情報を計算
 * @param diff 差分情報
 * @returns 統計情報
 */
export function calculateDiffStats(diff: Revision['diff']): {
  additions: number;
  deletions: number;
  changes: number;
} {
  if (!diff) {
    return { additions: 0, deletions: 0, changes: 0 };
  }

  let additions = 0;
  let deletions = 0;
  let changes = 0;

  for (const entry of diff.diffs) {
    switch (entry.type) {
      case 'insert':
        additions++;
        break;
      case 'delete':
        deletions++;
        break;
      case 'replace':
        changes++;
        break;
    }
  }

  return { additions, deletions, changes };
}

export default chatEditApi;
