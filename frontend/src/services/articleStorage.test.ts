/**
 * articleStorage ユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllArticles,
  createArticle,
  updateArticle,
  getArticle,
  deleteArticle,
  restoreArticle,
  permanentlyDeleteArticle,
  setArticleStatus,
  getArticles,
  saveAutoSave,
  getAutoSave,
  clearAutoSave,
  getStatistics,
} from './articleStorage';

// @wordpress/blocks のモック
vi.mock('@wordpress/blocks', () => ({
  serialize: vi.fn(() => '<!-- wp:paragraph --><p>Test</p><!-- /wp:paragraph -->'),
  parse: vi.fn(() => [
    {
      name: 'core/paragraph',
      attributes: { content: 'Test' },
      innerBlocks: [],
    },
  ]),
}));

// exportUtils のモック
vi.mock('../utils/exportUtils', () => ({
  generateMeta: vi.fn((_blocks, existingMeta) => ({
    title: existingMeta?.title || 'テストタイトル',
    description: existingMeta?.description || 'テスト説明',
    keywords: existingMeta?.keywords || ['キーワード'],
    author: existingMeta?.author || '',
    createdAt: existingMeta?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: 100,
    blockCount: 1,
  })),
}));

describe('articleStorage', () => {
  let mockStorage: Record<string, string>;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();

    // オリジナルを保存
    originalLocalStorage = window.localStorage;

    // localStorage を完全にモック
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
      length: 0,
      key: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    // 元に戻す
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe('getAllArticles', () => {
    it('空の配列を返す（データなし）', () => {
      const articles = getAllArticles();
      expect(articles).toEqual([]);
    });

    it('保存された記事を返す', () => {
      const testArticles = [
        {
          id: 'test-1',
          title: 'テスト記事',
          content: '<p>Test</p>',
          meta: { title: 'テスト', wordCount: 10, blockCount: 1 },
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      mockStorage['blog-agent-articles'] = JSON.stringify(testArticles);

      const articles = getAllArticles();
      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('テスト記事');
    });
  });

  describe('createArticle', () => {
    it('新しい記事を作成する', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'テスト' },
          innerBlocks: [],
        },
      ];
      const article = createArticle(blocks, 'テストタイトル');

      expect(article.id).toMatch(/^article-/);
      expect(article.status).toBe('draft');
      expect(article.title).toBe('テストタイトル');
    });
  });

  describe('updateArticle', () => {
    it('既存の記事を更新する', () => {
      const testArticle = {
        id: 'test-1',
        title: 'テスト記事',
        content: '<p>Test</p>',
        meta: { title: 'テスト', wordCount: 10, blockCount: 1 },
        status: 'draft',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      mockStorage['blog-agent-articles'] = JSON.stringify([testArticle]);

      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: '更新されたコンテンツ' },
          innerBlocks: [],
        },
      ];
      const updated = updateArticle('test-1', blocks, '更新タイトル');

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('更新タイトル');
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(testArticle.updatedAt).getTime()
      );
    });

    it('存在しない記事はnullを返す', () => {
      const result = updateArticle('nonexistent', [], 'タイトル');
      expect(result).toBeNull();
    });
  });

  describe('getArticle', () => {
    it('IDで記事を取得する', () => {
      const testArticle = {
        id: 'test-1',
        title: 'テスト記事',
        content: '<p>Test</p>',
        meta: {},
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockStorage['blog-agent-articles'] = JSON.stringify([testArticle]);

      const article = getArticle('test-1');
      expect(article?.title).toBe('テスト記事');
    });

    it('存在しないIDはnullを返す', () => {
      const article = getArticle('nonexistent');
      expect(article).toBeNull();
    });
  });

  describe('deleteArticle', () => {
    it('記事をソフトデリートする', () => {
      const testArticle = {
        id: 'test-1',
        title: 'テスト記事',
        content: '<p>Test</p>',
        meta: {},
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockStorage['blog-agent-articles'] = JSON.stringify([testArticle]);

      const result = deleteArticle('test-1');
      expect(result).toBe(true);

      const articles = JSON.parse(mockStorage['blog-agent-articles']);
      expect(articles[0].status).toBe('deleted');
      expect(articles[0].deletedAt).toBeDefined();
    });
  });

  describe('restoreArticle', () => {
    it('削除された記事を復元する', () => {
      const testArticle = {
        id: 'test-1',
        title: 'テスト記事',
        content: '<p>Test</p>',
        meta: {},
        status: 'deleted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
      };
      mockStorage['blog-agent-articles'] = JSON.stringify([testArticle]);

      const result = restoreArticle('test-1');
      expect(result).toBe(true);

      const articles = JSON.parse(mockStorage['blog-agent-articles']);
      expect(articles[0].status).toBe('draft');
      expect(articles[0].deletedAt).toBeUndefined();
    });
  });

  describe('permanentlyDeleteArticle', () => {
    it('記事を完全に削除する', () => {
      const testArticles = [
        { id: 'test-1', title: '記事1', status: 'deleted' },
        { id: 'test-2', title: '記事2', status: 'draft' },
      ];
      mockStorage['blog-agent-articles'] = JSON.stringify(testArticles);

      const result = permanentlyDeleteArticle('test-1');
      expect(result).toBe(true);

      const articles = JSON.parse(mockStorage['blog-agent-articles']);
      expect(articles).toHaveLength(1);
      expect(articles[0].id).toBe('test-2');
    });
  });

  describe('setArticleStatus', () => {
    it('記事のステータスを変更する', () => {
      const testArticle = {
        id: 'test-1',
        title: 'テスト記事',
        content: '<p>Test</p>',
        meta: {},
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockStorage['blog-agent-articles'] = JSON.stringify([testArticle]);

      const result = setArticleStatus('test-1', 'published');
      expect(result).toBe(true);

      const articles = JSON.parse(mockStorage['blog-agent-articles']);
      expect(articles[0].status).toBe('published');
    });
  });

  describe('getArticles', () => {
    const testArticles = [
      {
        id: 'test-1',
        title: 'AAA記事',
        content: '<p>Test</p>',
        meta: { description: '説明A', keywords: ['キーワードA'] },
        status: 'draft',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
      {
        id: 'test-2',
        title: 'BBB記事',
        content: '<p>Test</p>',
        meta: { description: '説明B', keywords: ['キーワードB'] },
        status: 'published',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'test-3',
        title: 'CCC記事',
        content: '<p>Test</p>',
        meta: { description: '説明C', keywords: ['キーワードC'] },
        status: 'deleted',
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    beforeEach(() => {
      mockStorage['blog-agent-articles'] = JSON.stringify(testArticles);
    });

    it('削除済み以外の記事を返す（デフォルト）', () => {
      const articles = getArticles();
      expect(articles).toHaveLength(2);
      expect(articles.every((a) => a.status !== 'deleted')).toBe(true);
    });

    it('ステータスでフィルタする', () => {
      const drafts = getArticles({ status: 'draft' });
      expect(drafts).toHaveLength(1);
      expect(drafts[0].status).toBe('draft');

      const published = getArticles({ status: 'published' });
      expect(published).toHaveLength(1);
      expect(published[0].status).toBe('published');
    });

    it('検索でフィルタする', () => {
      const results = getArticles({ search: 'AAA' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('AAA記事');
    });

    it('更新日でソートする（降順）', () => {
      const articles = getArticles({ sortBy: 'updatedAt', sortOrder: 'desc' });
      expect(articles[0].title).toBe('AAA記事');
    });

    it('タイトルでソートする（昇順）', () => {
      const articles = getArticles({ sortBy: 'title', sortOrder: 'asc' });
      expect(articles[0].title).toBe('AAA記事');
      expect(articles[1].title).toBe('BBB記事');
    });
  });

  describe('Auto Save', () => {
    it('自動保存データを保存・取得する', () => {
      const blocks = [
        {
          name: 'core/paragraph',
          attributes: { content: 'テスト' },
          innerBlocks: [],
        },
      ];
      saveAutoSave('article-1', blocks);

      const autoSave = getAutoSave();
      expect(autoSave).not.toBeNull();
      expect(autoSave?.articleId).toBe('article-1');
    });

    it('自動保存データをクリアする', () => {
      mockStorage['blog-agent-autosave'] = JSON.stringify({
        articleId: 'test',
        content: 'test',
        savedAt: new Date().toISOString(),
      });

      clearAutoSave();
      expect(mockStorage['blog-agent-autosave']).toBeUndefined();
    });
  });

  describe('getStatistics', () => {
    it('統計情報を返す', () => {
      const testArticles = [
        { id: '1', status: 'draft', meta: { wordCount: 100 } },
        { id: '2', status: 'draft', meta: { wordCount: 200 } },
        { id: '3', status: 'published', meta: { wordCount: 300 } },
        { id: '4', status: 'deleted', meta: { wordCount: 400 } },
      ];
      mockStorage['blog-agent-articles'] = JSON.stringify(testArticles);

      const stats = getStatistics();
      expect(stats.total).toBe(3); // 削除済み除く
      expect(stats.drafts).toBe(2);
      expect(stats.published).toBe(1);
      expect(stats.deleted).toBe(1);
      expect(stats.totalWords).toBe(600); // 削除済み除く
    });
  });
});
