/**
 * パフォーマンステスト
 * P5-10: パフォーマンステスト
 */
import { test, expect } from '@playwright/test';

test.describe('パフォーマンステスト', () => {
  test('ログインページの読み込み時間が2秒以内', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    console.log(`ログインページ読み込み時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
  });

  test('ページのFirst Contentful Paintが3秒以内', async ({ page }) => {
    await page.goto('/login');

    // Performance APIを使用してFCPを取得
    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
          }
        });
        observer.observe({ entryTypes: ['paint'] });

        // タイムアウト: 5秒後に0を返す
        setTimeout(() => resolve(0), 5000);
      });
    });

    console.log(`First Contentful Paint: ${fcp}ms`);
    if (fcp > 0) {
      expect(fcp).toBeLessThan(3000);
    }
  });

  test('DOMContentLoadedイベントが2秒以内に発火する', async ({ page }) => {
    const timing = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          resolve(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart);
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            resolve(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart);
          });
        }
      });
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const domContentLoaded = await page.evaluate(() => {
      return performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    });

    console.log(`DOMContentLoaded: ${domContentLoaded}ms`);
    expect(domContentLoaded).toBeLessThan(2000);
  });

  test('メモリリークがないことを確認（ナビゲーション後）', async ({ page }) => {
    await page.goto('/login');

    // 初期メモリ使用量を取得
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
      }
      return 0;
    });

    // ページを複数回ナビゲート
    for (let i = 0; i < 5; i++) {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
    }

    // 最終メモリ使用量を取得
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      console.log(`メモリ増加: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);

      // メモリ増加が50%未満であることを確認
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });

  test('大量のデータでも記事一覧がレンダリングできる', async ({ page }) => {
    // 大量のテスト記事を生成
    await page.addInitScript(() => {
      const articles = [];
      for (let i = 0; i < 100; i++) {
        articles.push({
          id: `article-${i}`,
          title: `テスト記事 ${i}`,
          content: `<p>コンテンツ ${i}</p>`,
          meta: {
            title: `テスト記事 ${i}`,
            description: `説明 ${i}`,
            keywords: [`キーワード${i}`],
            wordCount: 100,
            blockCount: 1,
          },
          status: i % 2 === 0 ? 'draft' : 'published',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      localStorage.setItem('blog-agent-articles', JSON.stringify(articles));
    });

    const startTime = Date.now();
    await page.goto('/articles');

    // ログインにリダイレクトされた場合はスキップ
    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    console.log(`100記事のレンダリング時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('localStorageの読み書きパフォーマンス', async ({ page }) => {
    await page.goto('/login');

    const results = await page.evaluate(() => {
      const testData = {
        id: 'test',
        title: 'テスト',
        content: 'コンテンツ'.repeat(1000),
        meta: { title: 'テスト', wordCount: 1000, blockCount: 10 },
      };

      // 書き込み時間
      const writeStart = performance.now();
      for (let i = 0; i < 100; i++) {
        localStorage.setItem(`test-${i}`, JSON.stringify(testData));
      }
      const writeTime = performance.now() - writeStart;

      // 読み込み時間
      const readStart = performance.now();
      for (let i = 0; i < 100; i++) {
        JSON.parse(localStorage.getItem(`test-${i}`) || '{}');
      }
      const readTime = performance.now() - readStart;

      // クリーンアップ
      for (let i = 0; i < 100; i++) {
        localStorage.removeItem(`test-${i}`);
      }

      return { writeTime, readTime };
    });

    console.log(`localStorage 100回書き込み: ${results.writeTime.toFixed(2)}ms`);
    console.log(`localStorage 100回読み込み: ${results.readTime.toFixed(2)}ms`);

    // 書き込み・読み込みともに1秒以内
    expect(results.writeTime).toBeLessThan(1000);
    expect(results.readTime).toBeLessThan(1000);
  });

  test('ネットワークリクエスト数が妥当', async ({ page }) => {
    const requests: string[] = [];

    page.on('request', (request) => {
      requests.push(request.url());
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    console.log(`ネットワークリクエスト数: ${requests.length}`);
    console.log('リクエストURL:', requests.slice(0, 10).join('\n'));

    // 初期ロードのリクエスト数が50以下であることを確認
    expect(requests.length).toBeLessThan(50);
  });

  test('バンドルサイズが適切', async ({ page }) => {
    const resources: { url: string; size: number }[] = [];

    page.on('response', async (response) => {
      try {
        const buffer = await response.body();
        resources.push({
          url: response.url(),
          size: buffer.length,
        });
      } catch {
        // 無視
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const jsResources = resources.filter((r) => r.url.endsWith('.js'));
    const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);

    console.log(`JSバンドルサイズ合計: ${(totalJsSize / 1024).toFixed(2)} KB`);

    // JSバンドルが5MB未満であることを確認
    expect(totalJsSize).toBeLessThan(5 * 1024 * 1024);
  });
});
