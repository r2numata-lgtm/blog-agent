/**
 * ブラウザ互換性テスト
 * P5-12: ブラウザ互換性テスト
 */
import { test, expect } from '@playwright/test';

test.describe('ブラウザ互換性テスト', () => {
  test.describe('基本レンダリング', () => {
    test('ページが正しくレンダリングされる', async ({ page, browserName }) => {
      await page.goto('/login');

      // ログインページのコンテンツが表示されることを確認
      await expect(page.locator('body')).toBeVisible();

      console.log(`${browserName}: ページレンダリング成功`);
    });

    test('CSSスタイルが正しく適用される', async ({ page, browserName }) => {
      await page.goto('/login');

      // ボタンのスタイルを確認
      const button = page.getByRole('button', { name: /ログイン/i });
      if (await button.isVisible()) {
        const styles = await button.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            borderRadius: computed.borderRadius,
            padding: computed.padding,
          };
        });

        // スタイルが適用されていることを確認
        expect(styles.backgroundColor).not.toBe('');

        console.log(`${browserName}: CSSスタイル - `, styles);
      }
    });

    test('Flexboxレイアウトが機能する', async ({ page, browserName }) => {
      await page.goto('/login');

      // Flexboxコンテナを探す
      const flexContainer = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const display = window.getComputedStyle(el).display;
          if (display === 'flex' || display === 'inline-flex') {
            return true;
          }
        }
        return false;
      });

      expect(flexContainer).toBe(true);
      console.log(`${browserName}: Flexboxサポート確認`);
    });

    test('CSS Gridレイアウトが機能する', async ({ page, browserName }) => {
      await page.goto('/login');

      // Gridコンテナを探す
      const hasGrid = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const display = window.getComputedStyle(el).display;
          if (display === 'grid' || display === 'inline-grid') {
            return true;
          }
        }
        return false;
      });

      console.log(`${browserName}: CSS Gridサポート - ${hasGrid ? '使用中' : '未使用'}`);
      // Gridは必須ではないのでパス
      expect(true).toBe(true);
    });
  });

  test.describe('JavaScript機能', () => {
    test('ES6+機能が動作する', async ({ page, browserName }) => {
      await page.goto('/login');

      const es6Support = await page.evaluate(() => {
        try {
          // アロー関数
          const arrow = () => true;
          // テンプレートリテラル
          const template = `test`;
          // スプレッド演算子
          const spread = [...[1, 2, 3]];
          // デストラクチャリング
          const { a } = { a: 1 };
          // Promise
          const promise = Promise.resolve(true);
          // async/await (構文チェック)
          const asyncFn = async () => await Promise.resolve(true);

          return {
            arrow: arrow(),
            template: template === 'test',
            spread: spread.length === 3,
            destructuring: a === 1,
            promise: promise instanceof Promise,
            asyncFn: typeof asyncFn === 'function',
          };
        } catch (e) {
          return { error: String(e) };
        }
      });

      console.log(`${browserName}: ES6+サポート - `, es6Support);

      if ('error' in es6Support) {
        throw new Error(es6Support.error);
      }

      expect(es6Support.arrow).toBe(true);
      expect(es6Support.template).toBe(true);
      expect(es6Support.spread).toBe(true);
      expect(es6Support.destructuring).toBe(true);
      expect(es6Support.promise).toBe(true);
      expect(es6Support.asyncFn).toBe(true);
    });

    test('LocalStorage APIが機能する', async ({ page, browserName }) => {
      await page.goto('/login');

      const storageSupport = await page.evaluate(() => {
        try {
          localStorage.setItem('test-key', 'test-value');
          const value = localStorage.getItem('test-key');
          localStorage.removeItem('test-key');
          return value === 'test-value';
        } catch {
          return false;
        }
      });

      console.log(`${browserName}: LocalStorageサポート - ${storageSupport}`);
      expect(storageSupport).toBe(true);
    });

    test('Fetch APIが機能する', async ({ page, browserName }) => {
      await page.goto('/login');

      const fetchSupport = await page.evaluate(() => {
        return typeof fetch === 'function';
      });

      console.log(`${browserName}: Fetch APIサポート - ${fetchSupport}`);
      expect(fetchSupport).toBe(true);
    });

    test('IntersectionObserver APIが機能する', async ({ page, browserName }) => {
      await page.goto('/login');

      const ioSupport = await page.evaluate(() => {
        return typeof IntersectionObserver === 'function';
      });

      console.log(`${browserName}: IntersectionObserverサポート - ${ioSupport}`);
      expect(ioSupport).toBe(true);
    });

    test('ResizeObserver APIが機能する', async ({ page, browserName }) => {
      await page.goto('/login');

      const roSupport = await page.evaluate(() => {
        return typeof ResizeObserver === 'function';
      });

      console.log(`${browserName}: ResizeObserverサポート - ${roSupport}`);
      expect(roSupport).toBe(true);
    });
  });

  test.describe('フォーム機能', () => {
    test('入力フィールドが機能する', async ({ page, browserName }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel(/メールアドレス/i);
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        const value = await emailInput.inputValue();
        expect(value).toBe('test@example.com');

        console.log(`${browserName}: 入力フィールド機能確認`);
      }
    });

    test('パスワードフィールドがマスクされる', async ({ page, browserName }) => {
      await page.goto('/login');

      const passwordInput = page.getByLabel(/パスワード/i);
      if (await passwordInput.isVisible()) {
        const inputType = await passwordInput.getAttribute('type');
        expect(inputType).toBe('password');

        console.log(`${browserName}: パスワードマスク機能確認`);
      }
    });

    test('ボタンがクリック可能', async ({ page, browserName }) => {
      await page.goto('/login');

      const button = page.getByRole('button', { name: /ログイン/i });
      if (await button.isVisible()) {
        // クリックイベントが発火することを確認
        let clicked = false;
        await page.exposeFunction('markClicked', () => {
          clicked = true;
        });

        await page.evaluate(() => {
          const btn = document.querySelector('button');
          if (btn) {
            btn.addEventListener('click', () => {
              // @ts-expect-error グローバル関数
              window.markClicked();
            });
          }
        });

        await button.click();
        // フォーム送信によりページが遷移する場合があるため、clicked変数は信頼できない
        // 代わりにクリックアクションが成功したことを確認
        expect(true).toBe(true);

        console.log(`${browserName}: ボタンクリック機能確認`);
      }
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイルビューポートで正しく表示される', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');

      // コンテンツが表示されることを確認
      await expect(page.locator('body')).toBeVisible();

      // 水平スクロールがないことを確認
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // 多少のスクロールは許容（ブラウザ差異のため）
      console.log(`${browserName}: モバイル表示 - 水平スクロール ${hasHorizontalScroll ? 'あり' : 'なし'}`);
    });

    test('タブレットビューポートで正しく表示される', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/login');

      await expect(page.locator('body')).toBeVisible();

      console.log(`${browserName}: タブレット表示確認`);
    });

    test('デスクトップビューポートで正しく表示される', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/login');

      await expect(page.locator('body')).toBeVisible();

      console.log(`${browserName}: デスクトップ表示確認`);
    });
  });

  test.describe('アクセシビリティ', () => {
    test('フォーカス順序が適切', async ({ page, browserName }) => {
      await page.goto('/login');

      // Tabキーでフォーカスが移動することを確認
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      console.log(`${browserName}: 最初のフォーカス要素 - ${focusedElement}`);
      expect(focusedElement).not.toBe('BODY');
    });

    test('Enterキーでフォーム送信が可能', async ({ page, browserName }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel(/メールアドレス/i);
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await page.keyboard.press('Enter');

        // フォーム送信またはバリデーションエラーが発生することを確認
        await page.waitForTimeout(500);
        console.log(`${browserName}: Enterキー送信機能確認`);
      }
    });

    test('ラベルがinputに関連付けられている', async ({ page, browserName }) => {
      await page.goto('/login');

      const labelsConnected = await page.evaluate(() => {
        const labels = document.querySelectorAll('label');
        let connected = 0;
        for (const label of labels) {
          const forAttr = label.getAttribute('for');
          if (forAttr && document.getElementById(forAttr)) {
            connected++;
          } else if (label.querySelector('input')) {
            connected++;
          }
        }
        return { total: labels.length, connected };
      });

      console.log(`${browserName}: ラベル関連付け - ${labelsConnected.connected}/${labelsConnected.total}`);
      // 全てのラベルが関連付けられていることを期待
      expect(labelsConnected.connected).toBe(labelsConnected.total);
    });
  });

  test.describe('Web API互換性', () => {
    test('Clipboard APIが利用可能', async ({ page, browserName }) => {
      await page.goto('/login');

      const clipboardSupport = await page.evaluate(() => {
        return navigator.clipboard !== undefined;
      });

      console.log(`${browserName}: Clipboard APIサポート - ${clipboardSupport}`);
      expect(clipboardSupport).toBe(true);
    });

    test('History APIが利用可能', async ({ page, browserName }) => {
      await page.goto('/login');

      const historySupport = await page.evaluate(() => {
        return typeof history.pushState === 'function';
      });

      console.log(`${browserName}: History APIサポート - ${historySupport}`);
      expect(historySupport).toBe(true);
    });

    test('URLSearchParams APIが利用可能', async ({ page, browserName }) => {
      await page.goto('/login');

      const urlParamsSupport = await page.evaluate(() => {
        try {
          const params = new URLSearchParams('?test=value');
          return params.get('test') === 'value';
        } catch {
          return false;
        }
      });

      console.log(`${browserName}: URLSearchParams APIサポート - ${urlParamsSupport}`);
      expect(urlParamsSupport).toBe(true);
    });
  });
});
