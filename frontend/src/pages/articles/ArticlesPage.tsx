/**
 * ArticlesPage - 記事一覧ページ
 * Phase 5: P5-05 記事一覧画面, P5-07 記事検索・フィルタ, P5-08 記事削除・復元
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getArticles,
  deleteArticle,
  restoreArticle,
  permanentlyDeleteArticle,
  setArticleStatus,
  getStatistics,
  type OutputFormat,
} from '../../services/articleStorage';
import type { SavedArticle, ArticleFilter } from '../../services/articleStorage';

// 出力形式のラベル
const formatLabels: Record<OutputFormat, string> = {
  wordpress: 'WordPress',
  markdown: 'Markdown',
};

/**
 * ArticlesPage コンポーネント
 */
const ArticlesPage: React.FC = () => {
  const navigate = useNavigate();

  // フィルター状態
  const [filter, setFilter] = useState<ArticleFilter>({
    status: undefined,
    search: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  // 記事一覧
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [stats, setStats] = useState({ total: 0, drafts: 0, published: 0, deleted: 0, totalWords: 0 });

  // 選択状態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // データ読み込み
  const loadData = useCallback(() => {
    setArticles(getArticles(filter));
    setStats(getStatistics());
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 記事を開く
  const handleOpen = (id: string) => {
    navigate(`/editor?id=${id}`);
  };

  // 記事を削除
  const handleDelete = (id: string) => {
    if (confirm('この記事をゴミ箱に移動しますか？')) {
      deleteArticle(id);
      loadData();
    }
  };

  // 記事を復元
  const handleRestore = (id: string) => {
    restoreArticle(id);
    loadData();
  };

  // 記事を完全削除
  const handlePermanentDelete = (id: string) => {
    if (confirm('この記事を完全に削除しますか？この操作は元に戻せません。')) {
      permanentlyDeleteArticle(id);
      loadData();
    }
  };

  // ステータス変更
  const handleStatusChange = (id: string, status: 'draft' | 'published') => {
    setArticleStatus(id, status);
    loadData();
  };

  // 選択切り替え
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 全選択
  const selectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a.id)));
    }
  };

  // 一括削除
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`${selectedIds.size}件の記事をゴミ箱に移動しますか？`)) {
      selectedIds.forEach(id => deleteArticle(id));
      setSelectedIds(new Set());
      loadData();
    }
  };

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ステータスバッジ
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      deleted: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      draft: '下書き',
      published: '公開済み',
      deleted: '削除済み',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // 出力形式バッジ
  const FormatBadge = ({ format }: { format?: OutputFormat }) => {
    const actualFormat = format || 'wordpress';
    const styles: Record<OutputFormat, string> = {
      wordpress: 'bg-blue-100 text-blue-800',
      markdown: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${styles[actualFormat]}`}>
        {formatLabels[actualFormat]}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">記事一覧</h1>
          <p className="text-gray-600">生成した記事の管理と編集ができます</p>
        </div>
        <Link
          to="/generate"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新規記事を生成
        </Link>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">全記事</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">下書き</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.drafts}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">公開済み</div>
          <div className="text-2xl font-bold text-green-600">{stats.published}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">合計文字数</div>
          <div className="text-2xl font-bold">{stats.totalWords.toLocaleString()}</div>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* 検索 */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="タイトル、説明、キーワードで検索..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ステータスフィルター */}
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as ArticleFilter['status'] || undefined })}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全て（削除済み除く）</option>
            <option value="draft">下書きのみ</option>
            <option value="published">公開済みのみ</option>
            <option value="deleted">ゴミ箱</option>
            <option value="all">全て</option>
          </select>

          {/* ソート */}
          <select
            value={`${filter.sortBy}-${filter.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as [ArticleFilter['sortBy'], ArticleFilter['sortOrder']];
              setFilter({ ...filter, sortBy, sortOrder });
            }}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="updatedAt-desc">更新日（新しい順）</option>
            <option value="updatedAt-asc">更新日（古い順）</option>
            <option value="createdAt-desc">作成日（新しい順）</option>
            <option value="createdAt-asc">作成日（古い順）</option>
            <option value="title-asc">タイトル（A-Z）</option>
            <option value="title-desc">タイトル（Z-A）</option>
          </select>
        </div>
      </div>

      {/* 一括操作 */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-4">
          <span className="text-sm">{selectedIds.size}件選択中</span>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            一括削除
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
          >
            選択解除
          </button>
        </div>
      )}

      {/* 記事一覧 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {articles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filter.search ? '検索結果がありません' : '記事がありません'}
            {!filter.search && (
              <div className="mt-4">
                <Link
                  to="/generate"
                  className="text-blue-600 hover:underline"
                >
                  新しい記事を生成する
                </Link>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === articles.length && articles.length > 0}
                    onChange={selectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">タイトル</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">形式</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ステータス</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">文字数</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">更新日</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(article.id)}
                      onChange={() => toggleSelect(article.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleOpen(article.id)}
                      className="text-blue-600 hover:underline font-medium text-left"
                    >
                      {article.title}
                    </button>
                    {article.meta.description && (
                      <p className="text-sm text-gray-500 mt-1 truncate max-w-md">
                        {article.meta.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <FormatBadge format={article.outputFormat} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {article.meta.wordCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(article.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {article.status !== 'deleted' ? (
                        <>
                          <button
                            onClick={() => handleOpen(article.id)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            編集
                          </button>
                          {article.status === 'draft' ? (
                            <button
                              onClick={() => handleStatusChange(article.id, 'published')}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              公開
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(article.id, 'draft')}
                              className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                            >
                              下書き
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            削除
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRestore(article.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            復元
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(article.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            完全削除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ArticlesPage;
