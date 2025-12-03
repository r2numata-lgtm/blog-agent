# システムアーキテクチャ

**ドキュメントバージョン**: 1.0  
**最終更新日**: 2024-12-03  
**関連ドキュメント**: 00_project_overview.md, 01_requirements.md

---

## 📐 アーキテクチャ概要

ブログ生成エージェントは、AWSサーバーレスアーキテクチャをベースに構築します。

### アーキテクチャ原則
1. **サーバーレスファースト**: 管理コストを最小化
2. **マネージドサービス優先**: AWSの管理サービスを積極活用
3. **スケーラビリティ**: 自動スケーリング可能な設計
4. **コスト最適化**: 従量課金で初期コストを抑制
5. **セキュリティ**: AWS Well-Architected Framework準拠

---

## 🏗️ システム構成図

```
┌─────────────────────────────────────────────────────┐
│                     ユーザー                         │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS
                    ↓
┌─────────────────────────────────────────────────────┐
│              CloudFront (CDN)                        │
│              - SSL/TLS終端                           │
│              - キャッシュ                            │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
┌───────────────┐       ┌──────────────────┐
│  S3 Bucket    │       │  API Gateway     │
│  (Frontend)   │       │  (REST API)      │
│  - React SPA  │       │  - CORS設定      │
│  - Static     │       │  - Lambda統合    │
└───────────────┘       └────────┬─────────┘
                                 │
                                 ↓
                        ┌────────────────┐
                        │ Lambda         │
                        │ Authorizer     │
                        │ (JWT検証)      │
                        └────────┬───────┘
                                 │
                ┌────────────────┼────────────────┐
                ↓                ↓                ↓
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Lambda     │ │   Lambda     │ │   Lambda     │
        │ (記事生成)    │ │ (記事管理)    │ │ (認証処理)    │
        └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
               │                │                │
               ↓                ↓                ↓
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  Claude API  │ │  DynamoDB    │ │  Cognito     │
        │  (Anthropic) │ │  (記事DB)    │ │  (認証)      │
        └──────────────┘ └──────────────┘ └──────────────┘
                               │
                               ↓
                        ┌──────────────┐
                        │  S3 Bucket   │
                        │  (記事保存)   │
                        └──────────────┘
```

---

## 🔧 技術スタック詳細

### フロントエンド

#### フレームワーク・ライブラリ
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "@monaco-editor/react": "^4.6.0",
  "marked": "^11.0.0",
  "axios": "^1.6.0",
  "react-router-dom": "^6.20.0",
  "zustand": "^4.4.0"
}
```

#### 主要技術選定理由
- **Vite**: 高速なビルド＆HMR
- **TypeScript**: 型安全性によるバグ削減
- **Tailwind CSS**: ユーティリティファーストで迅速なスタイリング
- **Monaco Editor**: VSCode同等の編集体験
- **Zustand**: 軽量でシンプルな状態管理

---

### バックエンド

#### AWS Lambda関数構成

**1. 記事生成Lambda**
```yaml
関数名: blog-agent-generate-article
ランタイム: Python 3.11
メモリ: 1024 MB
タイムアウト: 60秒
環境変数:
  - CLAUDE_API_KEY
  - DYNAMODB_TABLE_ARTICLES
役割:
  - Claude APIで記事生成
  - Markdown + 独自タグで出力
  - DynamoDBに保存
```

**2. 記事管理Lambda**
```yaml
関数名: blog-agent-manage-articles
ランタイム: Python 3.11
メモリ: 512 MB
タイムアウト: 30秒
環境変数:
  - DYNAMODB_TABLE_ARTICLES
  - S3_BUCKET_ARTICLES
役割:
  - 記事CRUD操作
  - 記事一覧取得
  - S3との連携
```

**3. HTML変換Lambda**
```yaml
関数名: blog-agent-convert-html
ランタイム: Node.js 20
メモリ: 512 MB
タイムアウト: 10秒
環境変数:
  - なし（フロント処理でも可）
役割:
  - Markdown → HTML変換
  - 独自タグ → HTML+CSS変換
```

**4. Lambda Authorizer**
```yaml
関数名: blog-agent-authorizer
ランタイム: Python 3.11
メモリ: 256 MB
タイムアウト: 5秒
環境変数:
  - COGNITO_USER_POOL_ID
  - COGNITO_REGION
役割:
  - JWTトークン検証
  - API Gatewayの認可
```

---

### データベース

#### DynamoDB テーブル設計
→ 詳細は **03_database_schema.md** を参照

**使用テーブル**:
1. blog-agent-users（ユーザー情報）
2. blog-agent-articles（記事データ）
3. blog-agent-decorations（装飾設定）

---

### 認証・認可

#### AWS Cognito設定

**User Pool設定**
```yaml
プール名: blog-agent-users
サインイン方式: Email
パスワードポリシー:
  - 最小文字数: 8
  - 英数字混在必須
  - 特殊文字任意
MFA: 無効（MVP）
メール検証: 必須
パスワードリカバリ: メール
```

**App Client設定**
```yaml
クライアント名: blog-agent-web
認証フロー: USER_PASSWORD_AUTH
トークン有効期限:
  - アクセストークン: 1時間
  - IDトークン: 1時間
  - リフレッシュトークン: 30日
コールバックURL: https://yourdomain.com/callback
```

---

## 🌐 API設計

### API Gateway構成

#### エンドポイント一覧
→ 詳細は **04_api_specification.md** を参照

```
API名: blog-agent-api
タイプ: REST API
ステージ: dev, prod

エンドポイント:
  POST   /auth/signup
  POST   /auth/login
  POST   /auth/refresh
  POST   /articles/generate
  GET    /articles
  GET    /articles/{id}
  PUT    /articles/{id}
  DELETE /articles/{id}
  POST   /articles/{id}/convert
```

#### CORS設定
```yaml
許可オリジン: 
  - dev: http://localhost:5173
  - prod: https://yourdomain.com
許可メソッド: GET, POST, PUT, DELETE, OPTIONS
許可ヘッダー: Content-Type, Authorization
認証情報: true
```

---

## 💾 ストレージ構成

### S3バケット構成

**1. フロントエンドホスティング**
```yaml
バケット名: blog-agent-frontend-prod
用途: React SPAのホスティング
公開設定: CloudFront経由のみアクセス可
バージョニング: 有効
ライフサイクル: なし
```

**2. 記事保存**
```yaml
バケット名: blog-agent-articles-prod
用途: 生成記事のバックアップ
公開設定: 非公開
暗号化: AES-256
ライフサイクル:
  - 30日後にStandard-IA
  - 90日後にGlacier
```

**3. ログ保存**
```yaml
バケット名: blog-agent-logs-prod
用途: CloudFront, API Gatewayログ
公開設定: 非公開
ライフサイクル: 30日後削除
```

---

## 🔒 セキュリティアーキテクチャ

### セキュリティレイヤー

```
┌─────────────────────────────────────┐
│ Layer 1: ネットワークセキュリティ    │
│ - CloudFront (DDoS保護)             │
│ - WAF (オプション)                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Layer 2: 認証・認可                  │
│ - Cognito (ユーザー認証)             │
│ - Lambda Authorizer (API認可)        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Layer 3: アプリケーションセキュリティ │
│ - 入力バリデーション                  │
│ - XSS対策                            │
│ - レート制限                         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Layer 4: データセキュリティ           │
│ - DynamoDB暗号化                     │
│ - S3暗号化                           │
│ - Secrets Manager (APIキー)          │
└─────────────────────────────────────┘
```

### IAMロール設計

**Lambda実行ロール**
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
      "Resource": "arn:aws:dynamodb:*:*:table/blog-agent-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::blog-agent-articles-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:blog-agent-*"
    }
  ]
}
```

---

## 📊 監視・ログ設計

### CloudWatch監視項目

#### Lambda監視
```yaml
メトリクス:
  - 実行回数（Invocations）
  - エラー数（Errors）
  - 実行時間（Duration）
  - スロットル数（Throttles）
  - 同時実行数（ConcurrentExecutions）

アラーム設定:
  - エラー率 > 5%: SNS通知
  - 実行時間 > 50秒: SNS通知
```

#### API Gateway監視
```yaml
メトリクス:
  - リクエスト数（Count）
  - レイテンシ（Latency）
  - 4xxエラー（4XXError）
  - 5xxエラー（5XXError）

アラーム設定:
  - 5xxエラー率 > 1%: SNS通知
  - レイテンシ p95 > 3秒: SNS通知
```

#### DynamoDB監視
```yaml
メトリクス:
  - 読み込み容量消費
  - 書き込み容量消費
  - スロットルリクエスト

アラーム設定:
  - スロットル発生: SNS通知
```

### ログ設計

**ログレベル**
```
ERROR: エラー発生時（必須）
WARN: 警告事項（推奨）
INFO: 重要な処理の開始・終了
DEBUG: 開発時のみ
```

**ログフォーマット**
```json
{
  "timestamp": "2024-12-03T10:00:00Z",
  "level": "INFO",
  "service": "generate-article",
  "userId": "user123",
  "requestId": "req-abc-123",
  "message": "Article generation completed",
  "duration": 2500,
  "metadata": {
    "articleId": "art-xyz-789",
    "wordCount": 1500
  }
}
```

---

## 💰 コスト見積もり

### 月間コスト試算（ユーザー100人想定）

#### 前提条件
- ユーザー数: 100人
- 1人あたり月10記事生成
- 記事あたりClaude API: $0.10
- 1記事あたりLambda実行: 3回

#### AWS費用内訳

**Lambda**
```
実行回数: 100人 × 10記事 × 3回 = 3,000回/月
無料枠: 100万リクエスト/月（十分）
料金: $0（無料枠内）
```

**API Gateway**
```
リクエスト数: 3,000回/月
無料枠: 100万リクエスト/月
料金: $0（無料枠内）
```

**DynamoDB**
```
読み込み: 6,000回/月（記事取得 × 2）
書き込み: 3,000回/月（記事保存）
オンデマンド料金:
  読み込み: $0.00025 × 6 = $0.0015
  書き込み: $0.00125 × 3 = $0.00375
料金: $0.01/月（無料枠内）
```

**S3**
```
ストレージ: 1GB（記事保存）
リクエスト: 3,000回/月
料金: $0.02 + $0.01 = $0.03/月
```

**CloudFront**
```
データ転送: 10GB/月
リクエスト: 10,000回/月
料金: $0.85 + $0.01 = $0.86/月
```

**Cognito**
```
MAU: 100人
無料枠: 50,000 MAU/月
料金: $0（無料枠内）
```

**合計AWS費用: 約$1/月**（初期段階）

#### Claude API費用
```
記事生成: 100人 × 10記事 × $0.10 = $100/月
```

#### 総コスト
```
AWS: $1/月
Claude API: $100/月
合計: $101/月
```

※ユーザー数が増えるとClaude API費用が比例増加

---

## 🚀 スケーリング戦略

### 水平スケーリング
- Lambda: 自動スケーリング（デフォルト1000並列）
- DynamoDB: オンデマンドモードで自動スケール
- CloudFront: グローバル自動スケール

### 垂直スケーリング
- Lambdaメモリ増加（最大10GB）
- DynamoDBプロビジョニングモード検討（大規模時）

### キャッシュ戦略
- CloudFront: 静的コンテンツ24時間キャッシュ
- API Gateway: レスポンスキャッシュ（オプション）
- ブラウザキャッシュ: 適切なCache-Controlヘッダー

---

## 🔄 災害復旧（DR）

### バックアップ戦略

**DynamoDB**
```
- ポイントインタイムリカバリ: 有効
- バックアップ頻度: 毎日自動
- 保持期間: 7日
```

**S3**
```
- バージョニング: 有効
- レプリケーション: 無効（MVP）
- ライフサイクルポリシー: 30日後アーカイブ
```

### RTO/RPO目標

```
RTO (Recovery Time Objective): 4時間
RPO (Recovery Point Objective): 24時間
```

---

## 📋 技術的負債管理

### 既知の技術的制約（MVP）

1. **フロント処理でのHTML変換**
   - 理由: シンプルさ優先
   - 将来対応: Lambda関数化

2. **DynamoDBオンデマンドモード**
   - 理由: 初期は予測困難
   - 将来対応: プロビジョニングモードへ移行

3. **シングルリージョン構成**
   - 理由: コスト削減
   - 将来対応: マルチリージョン化

---

## 🔗 関連ドキュメント

- **01_requirements.md** - 非機能要件の詳細
- **03_database_schema.md** - データベース設計詳細
- **04_api_specification.md** - API仕様詳細
- **06_backend_design.md** - Lambda実装詳細
- **08_deployment_guide.md** - デプロイ手順
- **09_testing_strategy.md** - 性能テスト詳細

---

**最終更新**: 2024-12-03  
**レビュー者**: れんじろう  
**次回レビュー**: フェーズ移行時
