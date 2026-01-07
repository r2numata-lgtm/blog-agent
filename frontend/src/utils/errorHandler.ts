/**
 * エラーハンドリングユーティリティ
 * Phase 2: P2-16 エラーハンドリング強化
 */

import { ApiError } from '../services/api';

/**
 * エラーコードと日本語メッセージのマッピング
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // 認証エラー
  AUTH_001: 'ログインが必要です。再度ログインしてください。',
  AUTH_002: 'セッションの有効期限が切れました。再度ログインしてください。',
  AUTH_003: 'この操作を行う権限がありません。',

  // バリデーションエラー
  VALIDATION_001: '入力内容に問題があります。内容を確認してください。',
  VALIDATION_002: '入力内容が正しくありません。',
  VALIDATION_003: '必須項目が入力されていません。',

  // Claude APIエラー
  CLAUDE_001: 'AI記事生成サービスで一時的なエラーが発生しました。しばらく待ってから再試行してください。',
  CLAUDE_002: 'リクエストが集中しています。しばらく待ってから再試行してください。',

  // サーバーエラー
  SERVER_001: 'サーバーで予期しないエラーが発生しました。',
  SERVER_002: 'データベースエラーが発生しました。',

  // 記事エラー
  ARTICLE_001: '記事が見つかりません。',
  ARTICLE_002: '記事の保存に失敗しました。',

  // パースエラー
  PARSE_001: 'データの処理中にエラーが発生しました。',

  // ネットワークエラー
  NETWORK_001: 'ネットワーク接続に問題があります。接続を確認してください。',
  TIMEOUT_001: 'リクエストがタイムアウトしました。再試行してください。',

  // 不明なエラー
  UNKNOWN: 'エラーが発生しました。',
};

/**
 * エラーメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] || error.message || ERROR_MESSAGES.UNKNOWN;
  }

  if (error instanceof Error) {
    // ネットワークエラーの判定
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_001;
    }
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT_001;
    }
    return error.message || ERROR_MESSAGES.UNKNOWN;
  }

  if (typeof error === 'string') {
    return error;
  }

  return ERROR_MESSAGES.UNKNOWN;
}

/**
 * エラーがリトライ可能かどうかを判定
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // リトライ可能なエラーコード
    const retryableCodes = ['CLAUDE_001', 'CLAUDE_002', 'SERVER_001', 'TIMEOUT_001', 'NETWORK_001'];
    return retryableCodes.includes(error.code);
  }

  if (error instanceof Error) {
    return error.message.includes('Network') || error.message.includes('timeout');
  }

  return false;
}

/**
 * HTTPステータスコードに基づくエラーメッセージ
 */
export function getStatusCodeMessage(status: number): string {
  switch (status) {
    case 400:
      return '入力内容に問題があります。';
    case 401:
      return 'ログインが必要です。';
    case 403:
      return 'この操作を行う権限がありません。';
    case 404:
      return 'お探しのページまたはリソースが見つかりません。';
    case 429:
      return 'リクエストが多すぎます。しばらく待ってください。';
    case 500:
      return 'サーバーエラーが発生しました。';
    case 502:
    case 503:
    case 504:
      return 'サーバーが一時的に利用できません。しばらく待ってください。';
    default:
      return 'エラーが発生しました。';
  }
}

/**
 * エラーをログに記録
 */
export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  };

  console.error('[Error]', errorInfo);

  // 本番環境では外部ログサービスに送信することを検討
  // 例: Sentry, LogRocket, etc.
}

/**
 * リトライ付きの非同期関数実行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      if (onRetry) {
        onRetry(attempt, error);
      }

      // 指数バックオフ
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * エラー情報を含むオブジェクトの型
 */
export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
  isRetryable: boolean;
}

/**
 * エラー状態を作成
 */
export function createErrorState(error: unknown): ErrorState {
  return {
    hasError: true,
    message: getErrorMessage(error),
    code: error instanceof ApiError ? error.code : undefined,
    isRetryable: isRetryableError(error),
  };
}

/**
 * 初期エラー状態
 */
export const initialErrorState: ErrorState = {
  hasError: false,
  message: '',
  isRetryable: false,
};
