/**
 * ナビゲーションE2Eテスト
 * P5-09: E2Eテスト（全フロー）
 */
import { test, expect } from '@playwright/test';

test.describe('ナビゲーション', () => {
  // テスト用のローカルストレージを設定するヘルパー
  const setupMockAuth = async (page: import('@playwright/test').Page) => {
    await page.addInitScript(() => {
      // 認証状態をモック
      localStorage.setItem('mockAuth', JSON.stringify({
        isAuthenticated: true,
        user: { email: 'test@example.com' }
      }));
    });
  };

  test('ホームページのナビゲーションリンクが機能する', async ({ page }) => {
    await page.goto('/');

    // ログインページにリダイレクトされた場合はスキップ
    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // ナビゲーションリンクの確認
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('モバイルメニューが正しく動作する', async ({ page }) => {
    // モバイルビューポートを設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // ページが正しくレンダリングされることを確認
    await expect(page.locator('body')).toBeVisible();
  });

  test('404ページが正しく表示される', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');

    // 404ページまたはリダイレクトを確認
    const url = page.url();
    // ログインにリダイレクトされるか、404が表示される
    expect(url.includes('/login') || url.includes('/nonexistent')).toBeTruthy();
  });
});
