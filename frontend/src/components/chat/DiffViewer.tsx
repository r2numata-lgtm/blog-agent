/**
 * 差分表示コンポーネント
 * Phase 3: チャット修正の実装
 */

import type { DiffEntry, Revision } from '../../services/chatEditApi';

interface DiffViewerProps {
  diff: Revision['diff'];
  showStats?: boolean;
}

export function DiffViewer({ diff, showStats = true }: DiffViewerProps) {
  if (!diff || !diff.diffs || diff.diffs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        差分情報がありません
      </div>
    );
  }

  // 統計情報を計算
  const stats = {
    additions: diff.diffs.filter((d) => d.type === 'insert').length,
    deletions: diff.diffs.filter((d) => d.type === 'delete').length,
    changes: diff.diffs.filter((d) => d.type === 'replace').length,
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="font-medium text-sm text-gray-700">変更内容</span>

        {showStats && (
          <div className="flex items-center gap-3 text-sm">
            {stats.additions > 0 && (
              <span className="text-green-600">+{stats.additions} 追加</span>
            )}
            {stats.deletions > 0 && (
              <span className="text-red-600">-{stats.deletions} 削除</span>
            )}
            {stats.changes > 0 && (
              <span className="text-yellow-600">~{stats.changes} 変更</span>
            )}
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">
              {diff.length_change > 0 ? '+' : ''}
              {diff.length_change} 文字
            </span>
          </div>
        )}
      </div>

      {/* 差分表示 */}
      <div className="overflow-x-auto">
        <div className="font-mono text-sm">
          {diff.diffs.map((entry, index) => (
            <DiffLine key={index} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DiffLineProps {
  entry: DiffEntry;
}

function DiffLine({ entry }: DiffLineProps) {
  switch (entry.type) {
    case 'insert':
      return (
        <div className="bg-green-50 border-l-4 border-green-500 px-4 py-1">
          <span className="text-green-600 mr-2">+</span>
          <span className="text-green-800 whitespace-pre-wrap">
            {entry.new_text}
          </span>
        </div>
      );

    case 'delete':
      return (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-1">
          <span className="text-red-600 mr-2">-</span>
          <span className="text-red-800 line-through whitespace-pre-wrap">
            {entry.old_text}
          </span>
        </div>
      );

    case 'replace':
      return (
        <>
          <div className="bg-red-50 border-l-4 border-red-500 px-4 py-1">
            <span className="text-red-600 mr-2">-</span>
            <span className="text-red-800 line-through whitespace-pre-wrap">
              {entry.old_text}
            </span>
          </div>
          <div className="bg-green-50 border-l-4 border-green-500 px-4 py-1">
            <span className="text-green-600 mr-2">+</span>
            <span className="text-green-800 whitespace-pre-wrap">
              {entry.new_text}
            </span>
          </div>
        </>
      );

    default:
      return null;
  }
}

// サイドバイサイド表示
interface SideBySideDiffProps {
  originalContent: string;
  newContent: string;
}

export function SideBySideDiff({ originalContent, newContent }: SideBySideDiffProps) {
  const originalLines = originalContent.split('\n');
  const newLines = newContent.split('\n');

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* 変更前 */}
        <div>
          <div className="bg-red-50 px-4 py-2 border-b border-gray-200">
            <span className="font-medium text-sm text-red-700">変更前</span>
          </div>
          <div className="p-4 font-mono text-sm overflow-x-auto bg-gray-50 max-h-96 overflow-y-auto">
            {originalLines.map((line, i) => (
              <div key={i} className="py-0.5">
                <span className="text-gray-400 mr-3 select-none">{i + 1}</span>
                <span className="whitespace-pre-wrap">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 変更後 */}
        <div>
          <div className="bg-green-50 px-4 py-2 border-b border-gray-200">
            <span className="font-medium text-sm text-green-700">変更後</span>
          </div>
          <div className="p-4 font-mono text-sm overflow-x-auto bg-gray-50 max-h-96 overflow-y-auto">
            {newLines.map((line, i) => (
              <div key={i} className="py-0.5">
                <span className="text-gray-400 mr-3 select-none">{i + 1}</span>
                <span className="whitespace-pre-wrap">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiffViewer;
