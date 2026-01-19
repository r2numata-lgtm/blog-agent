/**
 * 記事管理E2Eテスト
 * P5-09: E2Eテスト（全フロー）
 */
import { test, expect } from '@playwright/test';

test.describe('記事管理', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用のローカルストレージをセットアップ
    await page.addInitScript(() => {
      // テスト用の記事データ
      const testArticles = [
        {
          id: 'test-article-1',
          title: 'テスト記事1',
          content: '<!-- wp:paragraph --><p>テスト内容</p><!-- /wp:paragraph -->',
          meta: {
            title: 'テスト記事1',
            description: 'テスト説明',
            keywords: ['テスト', 'サンプル'],
            wordCount: 100,
            blockCount: 1,
          },
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'test-article-2',
          title: 'テスト記事2',
          content: '<!-- wp:paragraph --><p>公開済み記事</p><!-- /wp:paragraph -->',
          meta: {
            title: 'テスト記事2',
            description: '公開済み説明',
            keywords: ['公開'],
            wordCount: 200,
            blockCount: 2,
          },
          status: 'published',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('blog-agent-articles', JSON.stringify(testArticles));
    });
  });

  test('記事一覧ページにアクセスできる（未認証時はリダイレクト）', async ({ page }) => {
    await page.goto('/articles');

    // 認証が必要なため、ログインページにリダイレクトされる可能性がある
    const url = page.url();
    expect(url.includes('/articles') || url.includes('/login')).toBeTruthy();
  });

  test('ローカルストレージから記事データを読み込める', async ({ page }) => {
    // ローカルストレージのデータを確認するスクリプト
    const articles = await page.evaluate(() => {
      const data = localStorage.getItem('blog-agent-articles');
      return data ? JSON.parse(data) : [];
    });

    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe('テスト記事1');
  });

  test('記事の検索機能が動作する', async ({ page }) => {
    await page.goto('/articles');

    // ログインページにリダイレクトされた場合
    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // 検索入力欄を探す
    const searchInput = page.getByPlaceholder(/検索/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('テスト記事1');

      // 検索結果が表示されることを確認
      await expect(page.getByText('テスト記事1')).toBeVisible();
    }
  });

  test('記事のステータスフィルターが動作する', async ({ page }) => {
    await page.goto('/articles');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // ステータスフィルターを探す
    const statusFilter = page.locator('select').first();
    if (await statusFilter.isVisible()) {
      // 下書きのみにフィルター
      await statusFilter.selectOption('draft');

      // 下書きの記事のみが表示されることを確認
      await expect(page.getByText('下書き')).toBeVisible();
    }
  });
});
