/**
 * リビジョン一覧コンポーネント
 * Phase 3: チャット修正の実装
 */

import { useState } from 'react';
import type { Revision } from '../../services/chatEditApi';
import { DiffViewer } from './DiffViewer';

interface RevisionListProps {
  revisions: Revision[];
  onRevert?: (revisionId: string) => void;
  isReverting?: boolean;
}

export function RevisionList({
  revisions,
  onRevert,
  isReverting = false,
}: RevisionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // アクションのアイコンと色
  const actionStyles: Record<string, { icon: string; color: string; bgColor: string }> = {
    edit: {
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    append: {
      icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    replace_section: {
      icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    no_change: {
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    undo: {
      icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  };

  if (revisions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>編集履歴がありません</p>
      </div>
    );
  }

  // 新しい順にソート
  const sortedRevisions = [...revisions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="divide-y divide-gray-200">
      {sortedRevisions.map((revision, index) => {
        const style = actionStyles[revision.action] || actionStyles.edit;
        const timestamp = new Date(revision.timestamp * 1000);
        const isExpanded = expandedId === revision.revisionId;
        const isLatest = index === 0;

        return (
          <div key={revision.revisionId} className="p-4">
            {/* ヘッダー */}
            <div className="flex items-start gap-3">
              {/* アイコン */}
              <div className={`p-2 rounded-full ${style.bgColor}`}>
                <svg
                  className={`w-4 h-4 ${style.color}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={style.icon}
                  />
                </svg>
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 truncate">
                    {revision.explanation}
                  </span>
                  {isLatest && (
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                      最新
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  指示: {revision.instruction}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {timestamp.toLocaleString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-2">
                {/* 詳細表示ボタン */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : revision.revisionId)
                  }
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={isExpanded ? '閉じる' : '詳細を表示'}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* 元に戻すボタン */}
                {onRevert && revision.action !== 'undo' && !isLatest && (
                  <button
                    type="button"
                    onClick={() => onRevert(revision.revisionId)}
                    disabled={isReverting}
                    className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                    title="この状態に戻す"
                  >
                    {isReverting ? '処理中...' : '戻す'}
                  </button>
                )}
              </div>
            </div>

            {/* 展開時の詳細 */}
            {isExpanded && revision.diff && (
              <div className="mt-4 ml-11">
                <DiffViewer diff={revision.diff} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default RevisionList;
