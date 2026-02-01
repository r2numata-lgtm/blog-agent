/**
 * 記事ストレージサービス
 * Phase 5: P5-05〜P5-08 記事管理機能
 */

import { serialize, parse } from '@wordpress/blocks';
import { generateMeta } from '../utils/exportUtils';
import type { ArticleMeta } from '../utils/exportUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockInstance = any;

/**
 * 出力形式の型（WordPress と Markdown のみ）
 */
export type OutputFormat = 'wordpress' | 'markdown';

/**
 * 保存された記事
 */
export interface SavedArticle {
  id: string;
  title: string;
  content: string; // Gutenberg HTML形式
  meta: ArticleMeta;
  outputFormat: OutputFormat;
  status: 'draft' | 'published' | 'deleted';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * 記事一覧のフィルター
 */
export interface ArticleFilter {
  status?: 'draft' | 'published' | 'deleted' | 'all';
  search?: string;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

const STORAGE_KEY = 'blog-agent-articles';
const AUTO_SAVE_KEY = 'blog-agent-autosave';

/**
 * UUIDを生成
 */
function generateId(): string {
  return 'article-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * 全記事を取得
 */
export function getAllArticles(): SavedArticle[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load articles:', e);
    return [];
  }
}

/**
 * 記事を保存
 */
function saveAllArticles(articles: SavedArticle[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch (e) {
    console.error('Failed to save articles:', e);
    throw new Error('記事の保存に失敗しました');
  }
}

/**
 * 記事を作成（WordPress用 - ブロック形式）
 */
export function createArticle(
  blocks: BlockInstance[],
  title?: string,
  outputFormat: OutputFormat = 'wordpress'
): SavedArticle {
  const now = new Date().toISOString();
  const content = serialize(blocks);
  const meta = generateMeta(blocks, { title, createdAt: now });

  const article: SavedArticle = {
    id: generateId(),
    title: meta.title || '無題の記事',
    content,
    meta,
    outputFormat,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  const articles = getAllArticles();
  articles.push(article);
  saveAllArticles(articles);

  return article;
}

/**
 * Markdown記事を作成（Markdownをそのまま保存）
 */
export function createMarkdownArticle(
  markdown: string,
  title?: string
): SavedArticle {
  const now = new Date().toISOString();

  // 文字数をカウント
  const wordCount = markdown.replace(/\s/g, '').length;

  const article: SavedArticle = {
    id: generateId(),
    title: title || '無題の記事',
    content: markdown,  // Markdownをそのまま保存
    meta: {
      title: title || '無題の記事',
      description: markdown.slice(0, 140).replace(/[#*\n]/g, ' ').trim(),
      keywords: [],
      author: '',
      wordCount,
      blockCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    outputFormat: 'markdown',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  const articles = getAllArticles();
  articles.push(article);
  saveAllArticles(articles);

  return article;
}

/**
 * 記事を更新（WordPress用 - ブロック形式）
 */
export function updateArticle(id: string, blocks: BlockInstance[], title?: string): SavedArticle | null {
  const articles = getAllArticles();
  const index = articles.findIndex(a => a.id === id);

  if (index === -1) return null;

  const now = new Date().toISOString();
  const content = serialize(blocks);
  const existingMeta = articles[index].meta;
  const meta = generateMeta(blocks, {
    ...existingMeta,
    title: title || existingMeta.title,
    updatedAt: now,
  });

  articles[index] = {
    ...articles[index],
    title: meta.title || '無題の記事',
    content,
    meta,
    updatedAt: now,
  };

  saveAllArticles(articles);
  return articles[index];
}

/**
 * Markdown記事を更新（Markdownをそのまま保存）
 */
export function updateMarkdownArticle(id: string, markdown: string, title?: string): SavedArticle | null {
  const articles = getAllArticles();
  const index = articles.findIndex(a => a.id === id);

  if (index === -1) return null;

  const now = new Date().toISOString();
  const wordCount = markdown.replace(/\s/g, '').length;
  const existingMeta = articles[index].meta;

  articles[index] = {
    ...articles[index],
    title: title || existingMeta.title || '無題の記事',
    content: markdown,
    meta: {
      ...existingMeta,
      title: title || existingMeta.title,
      wordCount,
      updatedAt: now,
    },
    updatedAt: now,
  };

  saveAllArticles(articles);
  return articles[index];
}

/**
 * 記事を取得
 */
export function getArticle(id: string): SavedArticle | null {
  const articles = getAllArticles();
  return articles.find(a => a.id === id) || null;
}

/**
 * 記事のブロックを取得
 */
export function getArticleBlocks(id: string): BlockInstance[] | null {
  const article = getArticle(id);
  if (!article) return null;

  try {
    return parse(article.content);
  } catch (e) {
    console.error('Failed to parse article content:', e);
    return null;
  }
}

/**
 * 記事を削除（ソフトデリート）
 * P5-08: 記事削除
 */
export function deleteArticle(id: string): boolean {
  const articles = getAllArticles();
  const index = articles.findIndex(a => a.id === id);

  if (index === -1) return false;

  articles[index] = {
    ...articles[index],
    status: 'deleted',
    deletedAt: new Date().toISOString(),
  };

  saveAllArticles(articles);
  return true;
}

/**
 * 記事を復元
 * P5-08: 記事復元
 */
export function restoreArticle(id: string): boolean {
  const articles = getAllArticles();
  const index = articles.findIndex(a => a.id === id);

  if (index === -1) return false;

  articles[index] = {
    ...articles[index],
    status: 'draft',
    deletedAt: undefined,
  };

  saveAllArticles(articles);
  return true;
}

/**
 * 記事を完全削除
 */
export function permanentlyDeleteArticle(id: string): boolean {
  const articles = getAllArticles();
  const filteredArticles = articles.filter(a => a.id !== id);

  if (filteredArticles.length === articles.length) return false;

  saveAllArticles(filteredArticles);
  return true;
}

/**
 * 記事を公開/下書きに変更
 */
export function setArticleStatus(id: string, status: 'draft' | 'published'): boolean {
  const articles = getAllArticles();
  const index = articles.findIndex(a => a.id === id);

  if (index === -1) return false;

  articles[index] = {
    ...articles[index],
    status,
    updatedAt: new Date().toISOString(),
  };

  saveAllArticles(articles);
  return true;
}

/**
 * 記事一覧を取得（フィルタ・ソート付き）
 * P5-05: 記事一覧
 * P5-07: 記事検索・フィルタ
 */
export function getArticles(filter: ArticleFilter = {}): SavedArticle[] {
  let articles = getAllArticles();

  // ステータスでフィルタ
  if (filter.status && filter.status !== 'all') {
    articles = articles.filter(a => a.status === filter.status);
  } else if (!filter.status) {
    // デフォルトは削除済みを除外
    articles = articles.filter(a => a.status !== 'deleted');
  }

  // 検索
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    articles = articles.filter(a =>
      a.title.toLowerCase().includes(searchLower) ||
      a.meta.description.toLowerCase().includes(searchLower) ||
      a.meta.keywords.some(k => k.toLowerCase().includes(searchLower))
    );
  }

  // ソート
  const sortBy = filter.sortBy || 'updatedAt';
  const sortOrder = filter.sortOrder || 'desc';

  articles.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
      default:
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return articles;
}

/**
 * 自動保存データを保存
 * P5-06: 自動保存機能
 */
export function saveAutoSave(articleId: string | null, blocks: BlockInstance[]): void {
  try {
    const data = {
      articleId,
      content: serialize(blocks),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to auto-save:', e);
  }
}

/**
 * 自動保存データを取得
 */
export function getAutoSave(): { articleId: string | null; content: string; savedAt: string } | null {
  try {
    const data = localStorage.getItem(AUTO_SAVE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load auto-save:', e);
    return null;
  }
}

/**
 * 自動保存データを削除
 */
export function clearAutoSave(): void {
  localStorage.removeItem(AUTO_SAVE_KEY);
}

/**
 * 統計情報を取得
 */
export function getStatistics(): {
  total: number;
  drafts: number;
  published: number;
  deleted: number;
  totalWords: number;
} {
  const articles = getAllArticles();

  return {
    total: articles.filter(a => a.status !== 'deleted').length,
    drafts: articles.filter(a => a.status === 'draft').length,
    published: articles.filter(a => a.status === 'published').length,
    deleted: articles.filter(a => a.status === 'deleted').length,
    totalWords: articles
      .filter(a => a.status !== 'deleted')
      .reduce((sum, a) => sum + a.meta.wordCount, 0),
  };
}
