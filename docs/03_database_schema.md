# データベーススキーマ

**ドキュメントバージョン**: 1.0  
**最終更新日**: 2024-12-03  
**関連ドキュメント**: 02_architecture.md, 01_requirements.md

---

## 📋 データベース概要

ブログ生成エージェントでは、AWS DynamoDBをメインデータベースとして使用します。

### 選定理由
- サーバーレスアーキテクチャとの親和性が高い
- 自動スケーリング対応
- 運用負荷が低い
- 従量課金でコスト最適化しやすい

---

## 🗄️ テーブル設計

### テーブル一覧

| テーブル名 | 用途 | パーティションキー | ソートキー |
|-----------|------|------------------|-----------|
| blog-agent-users | ユーザー情報 | userId | - |
| blog-agent-articles | 記事データ | userId | articleId |
| blog-agent-decorations | 装飾設定 | userId | decorationId |

---

## 👤 テーブル1: blog-agent-users

### 概要
ユーザーの基本情報と設定を保存するテーブル。

### スキーマ定義

```json
{
  "TableName": "blog-agent-users",
  "KeySchema": [
    {
      "AttributeName": "userId",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "userId",
      "AttributeType": "S"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": false
  },
  "PointInTimeRecoverySpecification": {
    "PointInTimeRecoveryEnabled": true
  }
}
```

### 属性一覧

| 属性名 | 型 | 必須 | 説明 | 例 |
|--------|-----|------|------|-----|
| userId | String | ✅ | Cognito Sub（PK） | "a1b2c3d4-e5f6-..." |
| email | String | ✅ | メールアドレス | "user@example.com" |
| createdAt | Number | ✅ | 登録日時（UnixTimestamp） | 1701648000 |
| updatedAt | Number | ✅ | 最終更新日時 | 1701648000 |
| plan | String | ✅ | プラン種別 | "free" / "pro" |
| settings | Map | ❌ | ユーザー設定 | 下記参照 |
| statistics | Map | ❌ | 統計情報 | 下記参照 |

### settings属性の構造

```json
{
  "settings": {
    "theme": "light",
    "defaultDecorations": ["box-info", "balloon-left"],
    "editorFontSize": 14,
    "previewSync": true,
    "autoSave": true,
    "autoSaveInterval": 30
  }
}
```

### statistics属性の構造

```json
{
  "statistics": {
    "totalArticles": 25,
    "totalWords": 37500,
    "lastGeneratedAt": 1701648000,
    "monthlyUsage": {
      "2024-12": 10
    }
  }
}
```

### アクセスパターン

1. **ユーザー情報取得**
   - パターン: userId による取得
   - 操作: GetItem
   - 頻度: 高（ログイン時、設定変更時）

2. **ユーザー設定更新**
   - パターン: userId による更新
   - 操作: UpdateItem
   - 頻度: 中（設定変更時）

---

## 📝 テーブル2: blog-agent-articles

### 概要
生成・編集された記事データを保存するテーブル。

### スキーマ定義

```json
{
  "TableName": "blog-agent-articles",
  "KeySchema": [
    {
      "AttributeName": "userId",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "articleId",
      "KeyType": "RANGE"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "userId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "articleId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "createdAt",
      "AttributeType": "N"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "CreatedAtIndex",
      "KeySchema": [
        {
          "AttributeName": "userId",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "createdAt",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": false
  },
  "PointInTimeRecoverySpecification": {
    "PointInTimeRecoveryEnabled": true
  }
}
```

### 属性一覧

| 属性名 | 型 | 必須 | 説明 | 例 |
|--------|-----|------|------|-----|
| userId | String | ✅ | ユーザーID（PK） | "a1b2c3d4-e5f6-..." |
| articleId | String | ✅ | 記事ID（SK） | "art-20241203-001" |
| title | String | ✅ | 記事タイトル | "Reactの基本を学ぶ" |
| markdown | String | ✅ | Markdown本文 | "# はじめに\n..." |
| html | String | ❌ | 変換後HTML | "&lt;h1&gt;はじめに&lt;/h1&gt;..." |
| status | String | ✅ | ステータス | "draft" / "published" |
| createdAt | Number | ✅ | 作成日時 | 1701648000 |
| updatedAt | Number | ✅ | 更新日時 | 1701648000 |
| metadata | Map | ✅ | メタデータ | 下記参照 |
| decorations | List | ❌ | 使用装飾ID | ["box-info", "balloon-left"] |
| s3Key | String | ❌ | S3保存キー | "articles/user123/art-001.md" |

### metadata属性の構造

```json
{
  "metadata": {
    "wordCount": 1500,
    "targetAudience": "初心者",
    "purpose": "学習",
    "keywords": ["React", "JavaScript", "フロントエンド"],
    "generationTime": 25.5,
    "prompt": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.7
    }
  }
}
```

### アクセスパターン

1. **記事一覧取得（新しい順）**
   - パターン: userId + CreatedAtIndex
   - 操作: Query（降順）
   - 頻度: 高

2. **特定記事取得**
   - パターン: userId + articleId
   - 操作: GetItem
   - 頻度: 高

3. **記事更新**
   - パターン: userId + articleId
   - 操作: UpdateItem
   - 頻度: 中

4. **記事削除**
   - パターン: userId + articleId
   - 操作: DeleteItem
   - 頻度: 低

### データサイズ見積もり

```
1記事あたりの平均サイズ:
- タイトル: 50 bytes
- Markdown: 5,000 bytes（平均2000文字）
- HTML: 7,000 bytes
- メタデータ: 500 bytes
合計: 約 12.5 KB/記事

ユーザーあたり最大50記事: 625 KB
100ユーザー: 62.5 MB（十分に小さい）
```

---

## 🎨 テーブル3: blog-agent-decorations

### 概要
装飾設定を保存するテーブル。プリセット＋カスタム装飾を管理。

### スキーマ定義

```json
{
  "TableName": "blog-agent-decorations",
  "KeySchema": [
    {
      "AttributeName": "userId",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "decorationId",
      "KeyType": "RANGE"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "userId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "decorationId",
      "AttributeType": "S"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": false
  },
  "PointInTimeRecoverySpecification": {
    "PointInTimeRecoveryEnabled": true
  }
}
```

### 属性一覧

| 属性名 | 型 | 必須 | 説明 | 例 |
|--------|-----|------|------|-----|
| userId | String | ✅ | ユーザーID（PK） | "a1b2c3d4-e5f6-..." |
| decorationId | String | ✅ | 装飾ID（SK） | "box-info" |
| type | String | ✅ | 装飾タイプ | "box" / "balloon" / "button" |
| name | String | ✅ | 表示名 | "情報ボックス" |
| css | String | ✅ | CSSコード | ".box-info { ... }" |
| isDefault | Boolean | ✅ | デフォルト装飾か | true / false |
| createdAt | Number | ✅ | 作成日時 | 1701648000 |
| updatedAt | Number | ✅ | 更新日時 | 1701648000 |

### プリセット装飾データ（初期データ）

**情報ボックス**
```json
{
  "userId": "system",
  "decorationId": "box-info",
  "type": "box",
  "name": "情報ボックス",
  "css": ".box-info { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px; margin: 16px 0; border-radius: 4px; }",
  "isDefault": true,
  "createdAt": 1701648000,
  "updatedAt": 1701648000
}
```

**警告ボックス**
```json
{
  "userId": "system",
  "decorationId": "box-warning",
  "type": "box",
  "name": "警告ボックス",
  "css": ".box-warning { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px; margin: 16px 0; border-radius: 4px; }",
  "isDefault": true,
  "createdAt": 1701648000,
  "updatedAt": 1701648000
}
```

**吹き出し（左）**
```json
{
  "userId": "system",
  "decorationId": "balloon-left",
  "type": "balloon",
  "name": "吹き出し（左）",
  "css": ".balloon-left { position: relative; background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0 16px 60px; } .balloon-left::before { content: '😊'; position: absolute; left: -50px; top: 0; font-size: 40px; }",
  "isDefault": true,
  "createdAt": 1701648000,
  "updatedAt": 1701648000
}
```

### アクセスパターン

1. **全装飾取得**
   - パターン: userId による取得
   - 操作: Query
   - 頻度: 中（記事編集画面表示時）

2. **装飾作成**
   - パターン: userId + decorationId
   - 操作: PutItem
   - 頻度: 低（MVP後の機能）

---

## 🔍 インデックス設計

### GSI: CreatedAtIndex（blog-agent-articles）

**目的**: 記事を作成日時順に取得

**構成**:
```
パーティションキー: userId
ソートキー: createdAt
```

**クエリ例**:
```python
response = table.query(
    IndexName='CreatedAtIndex',
    KeyConditionExpression='userId = :uid',
    ExpressionAttributeValues={
        ':uid': 'user123'
    },
    ScanIndexForward=False,  # 降順
    Limit=20
)
```

**コスト影響**:
- 読み込みコスト: 記事一覧取得時のみ
- 書き込みコスト: 記事作成時に追加コスト（わずか）

---

## 💾 データライフサイクル

### バックアップ戦略

**ポイントインタイムリカバリ（PITR）**
```yaml
有効化: 全テーブル
保持期間: 35日（デフォルト）
復元可能単位: 秒単位
```

**オンデマンドバックアップ**
```yaml
頻度: 週1回（自動化）
保持期間: 3ヶ月
対象: 全テーブル
```

### データアーカイブ

**記事データ（blog-agent-articles）**
```
60日以上前の記事:
  1. DynamoDB Streamsでイベント検知
  2. Lambda関数でS3にエクスポート
  3. DynamoDBから削除（オプション）
```

---

## 📊 容量設計

### 容量見積もり

**ユーザー数100人の場合**

```
blog-agent-users:
  - 項目数: 100
  - 平均サイズ: 2 KB
  - 合計: 200 KB

blog-agent-articles:
  - 項目数: 5,000（100人 × 50記事）
  - 平均サイズ: 12.5 KB
  - 合計: 62.5 MB

blog-agent-decorations:
  - 項目数: 500（システム5 + ユーザー495）
  - 平均サイズ: 2 KB
  - 合計: 1 MB

総容量: 約 63.7 MB
```

**1,000ユーザーの場合**: 約 637 MB  
**10,000ユーザーの場合**: 約 6.37 GB

→ DynamoDBの容量制限（項目サイズ400KB）を考慮しても問題なし

---

## 🔐 セキュリティ設計

### 暗号化

**保存時の暗号化**
```yaml
暗号化方式: AWS管理キー（デフォルト）
暗号化アルゴリズム: AES-256
対象: 全テーブル
```

**転送時の暗号化**
```yaml
プロトコル: TLS 1.2以上
対象: すべてのAPI通信
```

### アクセス制御

**IAMポリシー**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/blog-agent-users",
        "arn:aws:dynamodb:*:*:table/blog-agent-articles",
        "arn:aws:dynamodb:*:*:table/blog-agent-articles/index/*",
        "arn:aws:dynamodb:*:*:table/blog-agent-decorations"
      ],
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
        }
      }
    }
  ]
}
```

---

## 🛠️ マイグレーション戦略

### 初期データ投入

**1. システム装飾データ**
```python
# scripts/seed_decorations.py
decorations = [
    {
        'userId': 'system',
        'decorationId': 'box-info',
        'type': 'box',
        'name': '情報ボックス',
        'css': '...',
        'isDefault': True,
        'createdAt': int(time.time()),
        'updatedAt': int(time.time())
    },
    # ... 他のプリセット
]

for decoration in decorations:
    table.put_item(Item=decoration)
```

### スキーマ変更手順

**新しい属性を追加する場合**
```
1. 既存データに影響なし（DynamoDBはスキーマレス）
2. アプリケーションコードで新属性を処理
3. 必要に応じてバックフィル（UpdateItem）
```

**属性名を変更する場合**
```
1. 新属性を追加
2. 旧属性から新属性へデータコピー
3. アプリケーションを新属性対応に更新
4. 旧属性を削除（オプション）
```

---

## 📈 パフォーマンスチューニング

### ベストプラクティス

**1. 効率的なクエリ**
```python
# Good: パーティションキー + ソートキーで絞り込み
response = table.query(
    KeyConditionExpression='userId = :uid AND articleId = :aid',
    ExpressionAttributeValues={':uid': user_id, ':aid': article_id}
)

# Bad: Scanは全件走査で遅い
response = table.scan(
    FilterExpression=Attr('title').contains('React')
)
```

**2. バッチ操作の活用**
```python
# 複数アイテムを一度に取得
response = dynamodb.batch_get_item(
    RequestItems={
        'blog-agent-articles': {
            'Keys': [
                {'userId': 'user123', 'articleId': 'art-001'},
                {'userId': 'user123', 'articleId': 'art-002'}
            ]
        }
    }
)
```

**3. プロジェクション式でデータ転送量削減**
```python
# 必要な属性のみ取得
response = table.query(
    KeyConditionExpression='userId = :uid',
    ProjectionExpression='articleId, title, createdAt',
    ExpressionAttributeValues={':uid': user_id}
)
```

---

## 🔗 関連ドキュメント

- **02_architecture.md** - DynamoDB の位置づけ
- **04_api_specification.md** - データアクセスAPI
- **06_backend_design.md** - Lambda からのアクセス実装
- **09_testing_strategy.md** - データベーステスト

---

**最終更新**: 2024-12-03  
**レビュー者**: れんじろう  
**次回レビュー**: Phase 3開始時
