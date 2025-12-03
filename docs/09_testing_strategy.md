# テスト戦略

**ドキュメントバージョン**: 1.0  
**最終更新日**: 2024-12-03  
**関連ドキュメント**: 01_requirements.md

---

## 🧪 テスト方針

### テストピラミッド

```
        /\
       /E2E\          少ない（遅い・高コスト）
      /------\
     /統合テスト\       中程度
    /----------\
   /  単体テスト  \     多い（速い・低コスト）
  /--------------\
```

### テストレベル

1. **単体テスト（Unit Test）**: 70%
2. **統合テスト（Integration Test）**: 20%
3. **E2Eテスト（End-to-End Test）**: 10%

---

## 🎯 テストカバレッジ目標

| 項目 | 目標 | 測定方法 |
|-----|------|---------|
| コードカバレッジ | 70%以上 | Jest/Vitest |
| 型カバレッジ | 80%以上 | TypeScript |
| クリティカルパス | 100% | E2Eテスト |

---

## 🔧 テストツール

### フロントエンド
```json
{
  "vitest": "^1.0.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/user-event": "^14.0.0",
  "playwright": "^1.40.0",
  "@vitest/coverage-v8": "^1.0.0"
}
```

### バックエンド
```python
pytest==7.4.0
pytest-cov==4.1.0
moto==4.2.0  # AWS モック
faker==20.1.0
```

---

## 📝 テストケース

### フロントエンド単体テスト

**Buttonコンポーネント**
```typescript
describe('Button', () => {
  it('クリックイベントが発火する', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('disabled時はクリックできない', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

### バックエンド単体テスト

**記事生成Lambda**
```python
def test_generate_article_success(mocker):
    # Claude APIをモック
    mock_claude = mocker.patch('anthropic.Anthropic')
    mock_claude.return_value.messages.create.return_value = Mock(
        content=[Mock(text='# Test Article\n\nContent')]
    )
    
    # DynamoDBをモック
    mock_table = mocker.patch('boto3.resource')
    
    event = {
        'requestContext': {'authorizer': {'principalId': 'user123'}},
        'body': json.dumps({
            'title': 'Test',
            'contentPoints': 'Test content'
        })
    }
    
    response = lambda_handler(event, None)
    
    assert response['statusCode'] == 200
    data = json.loads(response['body'])
    assert 'markdown' in data['data']
```

### E2Eテスト

**記事生成フロー**
```typescript
test('記事生成の完全フロー', async ({ page }) => {
  // ログイン
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  // エディタページに移動
  await page.goto('/editor');
  
  // フォーム入力
  await page.fill('[name="title"]', 'テスト記事');
  await page.fill('[name="contentPoints"]', 'テスト内容');
  await page.click('button:has-text("生成")');
  
  // 生成完了を待つ
  await page.waitForSelector('.preview-content', { timeout: 60000 });
  
  // プレビューに内容が表示されることを確認
  const preview = await page.textContent('.preview-content');
  expect(preview).toContain('テスト');
});
```

---

## 🔗 関連ドキュメント

- **01_requirements.md** - テスト要件
- **05_frontend_design.md** - フロントエンドテスト
- **06_backend_design.md** - バックエンドテスト

---

**最終更新**: 2024-12-03
