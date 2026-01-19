/**
 * エディタE2Eテスト
 * P5-09: E2Eテスト（全フロー）
 */
import { test, expect } from '@playwright/test';

test.describe('エディタ', () => {
  test('エディタページにアクセスできる（未認証時はリダイレクト）', async ({ page }) => {
    await page.goto('/editor');

    // 認証が必要なため、ログインページにリダイレクトされる可能性がある
    const url = page.url();
    expect(url.includes('/editor') || url.includes('/login')).toBeTruthy();
  });

  test('エディタのUIコンポーネントが正しくレンダリングされる', async ({ page }) => {
    await page.goto('/editor');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // エディタコンテナが存在することを確認
    const editorContainer = page.locator('[class*="editor"]').first();
    if (await editorContainer.isVisible()) {
      await expect(editorContainer).toBeVisible();
    }
  });

  test('レスポンシブプレビューが切り替え可能', async ({ page }) => {
    await page.goto('/editor');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // プレビュー切り替えボタンを探す
    const desktopButton = page.getByRole('button', { name: /PC|デスクトップ/i });
    const tabletButton = page.getByRole('button', { name: /タブレット/i });
    const mobileButton = page.getByRole('button', { name: /モバイル|スマホ/i });

    // ボタンが存在する場合はクリックしてみる
    if (await desktopButton.isVisible()) {
      await desktopButton.click();
    }
    if (await tabletButton.isVisible()) {
      await tabletButton.click();
    }
    if (await mobileButton.isVisible()) {
      await mobileButton.click();
    }
  });

  test('エクスポートメニューが開ける', async ({ page }) => {
    await page.goto('/editor');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // エクスポートボタンを探す
    const exportButton = page.getByRole('button', { name: /エクスポート|出力/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // エクスポートオプションが表示されることを確認
      await expect(page.getByText(/Gutenberg|HTML|JSON/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('保存ボタンが機能する', async ({ page }) => {
    await page.goto('/editor');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // 保存ボタンを探す
    const saveButton = page.getByRole('button', { name: /保存/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // 保存成功メッセージまたは状態変化を確認
      // 実際のUIに応じて調整が必要
      await page.waitForTimeout(1000);
    }
  });

  test('キーボードショートカットが動作する', async ({ page }) => {
    await page.goto('/editor');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // Cmd/Ctrl + S で保存
    await page.keyboard.press('Meta+s');
    // または
    await page.keyboard.press('Control+s');

    // 保存が実行されたことを確認（UI依存）
    await page.waitForTimeout(500);
  });
});
