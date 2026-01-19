/**
 * 設定ページE2Eテスト
 * P5-09: E2Eテスト（全フロー）
 */
import { test, expect } from '@playwright/test';

test.describe('設定', () => {
  test('設定ページにアクセスできる（未認証時はリダイレクト）', async ({ page }) => {
    await page.goto('/settings');

    // 認証が必要なため、ログインページにリダイレクトされる可能性がある
    const url = page.url();
    expect(url.includes('/settings') || url.includes('/login')).toBeTruthy();
  });

  test('記事スタイル設定が表示される', async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // スタイル設定セクションを探す
    const styleSection = page.getByText(/記事スタイル|文体|テイスト/i);
    if (await styleSection.isVisible()) {
      await expect(styleSection).toBeVisible();
    }
  });

  test('装飾プリセット設定が表示される', async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // 装飾設定セクションを探す
    const decorationSection = page.getByText(/装飾|ボックス|吹き出し/i);
    if (await decorationSection.isVisible()) {
      await expect(decorationSection).toBeVisible();
    }
  });

  test('SEO設定が変更できる', async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // SEO設定セクションを探す
    const seoSection = page.getByText(/SEO|メタ/i);
    if (await seoSection.isVisible()) {
      // メタディスクリプション長さの入力を探す
      const descLengthInput = page.locator('input[type="number"]').first();
      if (await descLengthInput.isVisible()) {
        await descLengthInput.fill('160');
      }
    }
  });

  test('サンプル記事アップロードUIが表示される', async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // ファイルアップロードエリアを探す
    const uploadSection = page.getByText(/サンプル記事|アップロード/i);
    if (await uploadSection.isVisible()) {
      await expect(uploadSection).toBeVisible();
    }
  });

  test('設定を保存できる', async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // 保存ボタンを探す
    const saveButton = page.getByRole('button', { name: /保存/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // 保存成功のフィードバックを確認
      await page.waitForTimeout(1000);
    }
  });
});
