/**
 * 認証フローE2Eテスト
 * P5-09: E2Eテスト（全フロー）
 */
import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('未認証ユーザーはログインページにリダイレクトされる', async ({ page }) => {
    // ホームページにアクセス
    await page.goto('/');

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/login/);

    // ログインフォームが表示されることを確認
    await expect(page.getByRole('heading', { name: /ログイン/i })).toBeVisible();
  });

  test('ログインフォームが正しく表示される', async ({ page }) => {
    await page.goto('/login');

    // フォーム要素の確認
    await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
    await expect(page.getByLabel(/パスワード/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /ログイン/i })).toBeVisible();

    // 登録リンクの確認
    await expect(page.getByText(/新規登録/i)).toBeVisible();
  });

  test('新規登録フォームが正しく表示される', async ({ page }) => {
    await page.goto('/register');

    // フォーム要素の確認
    await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
    await expect(page.getByLabel(/パスワード/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /登録/i })).toBeVisible();

    // ログインリンクの確認
    await expect(page.getByText(/ログイン/i)).toBeVisible();
  });

  test('無効なメールアドレスでログインするとエラーが表示される', async ({ page }) => {
    await page.goto('/login');

    // 無効な認証情報を入力
    await page.getByLabel(/メールアドレス/i).fill('invalid@example.com');
    await page.getByLabel(/パスワード/i).fill('wrongpassword');

    // ログインボタンをクリック
    await page.getByRole('button', { name: /ログイン/i }).click();

    // エラーメッセージが表示されることを確認
    await expect(page.getByText(/エラー|失敗|incorrect/i)).toBeVisible({ timeout: 10000 });
  });

  test('パスワードリセットページにアクセスできる', async ({ page }) => {
    await page.goto('/login');

    // パスワードリセットリンクをクリック
    await page.getByText(/パスワードを忘れた/i).click();

    // パスワードリセットページに遷移することを確認
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
  });
});
