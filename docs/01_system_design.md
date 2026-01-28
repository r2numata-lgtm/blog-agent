# Blog Agent システム設計書

**バージョン**: 1.0.0
**最終更新**: 2026-01-29
**ステータス**: 本番稼働中

---

## 1. システム概要

### 1.1 目的

Blog Agentは、Claude APIを活用してブログ記事を自動生成するWebアプリケーションです。

### 1.2 主要機能

| 機能 | 説明 |
|-----|------|
| 記事生成 | 2段階生成システムによる高品質な記事作成 |
| 装飾システム | 8種類のプリセット装飾（on/off切り替え） |
| チャット修正 | 生成記事の対話的な修正 |
| 出力形式 | WordPress Gutenberg / Markdown |

### 1.3 技術スタック

```
Frontend:  React 18 + TypeScript + Vite + Tailwind CSS
Backend:   AWS Lambda (Python 3.11)
Database:  Amazon DynamoDB
Auth:      Amazon Cognito
AI:        Claude API (Anthropic)
CDN:       Amazon CloudFront
IaC:       AWS CloudFormation
```

---

## 2. アーキテクチャ

### 2.1 システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      CloudFront         │     │      API Gateway        │
│   (Frontend Hosting)    │     │    (REST API v2)        │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│        S3 Bucket        │     │    Lambda Authorizer    │
│    (Static Assets)      │     │      (Cognito JWT)      │
└─────────────────────────┘     └─────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
          ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
          │ generate-article│     │   chat-edit     │     │ manage-settings │
          │    Lambda       │     │    Lambda       │     │    Lambda       │
          └─────────────────┘     └─────────────────┘     └─────────────────┘
                    │                         │                         │
                    ▼                         │                         │
          ┌─────────────────┐                 │                         │
          │   SQS Queue     │                 │                         │
          │ (Async Process) │                 │                         │
          └─────────────────┘                 │                         │
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              ▼
                              ┌───────────────────────────┐
                              │        DynamoDB           │
                              │  ┌─────────────────────┐  │
                              │  │ blog-agent-articles │  │
                              │  │ blog-agent-settings │  │
                              │  │ blog-agent-jobs     │  │
                              │  └─────────────────────┘  │
                              └───────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────┐
                              │       Claude API          │
                              │       (Anthropic)         │
                              └───────────────────────────┘
```

### 2.2 処理フロー（2段階生成）

```
[ユーザー入力]
     │
     ▼
[Step 1: 構造生成] ─────────────────────────────────────────┐
     │  Claude APIに渡す情報:                               │
     │  - 記事情報（タイトル、対象読者、キーワード等）      │
     │  - 文体設定                                          │
     │  - 有効な装飾リスト（id, label, schema, roles）      │
     │                                                      │
     ▼                                                      │
[Claude応答: JSON構造]                                      │
     │  {                                                   │
     │    "sections": [                                     │
     │      {                                               │
     │        "heading": "見出し",                          │
     │        "blocks": [                                   │
     │          {"type": "paragraph", "content": "..."},    │
     │          {"type": "paragraph", "content": "...",     │
     │           "decorationId": "ba-point",                │
     │           "title": "ポイントのタイトル"}             │
     │        ]                                             │
     │      }                                               │
     │    ]                                                 │
     │  }                                                   │
     ▼                                                      │
[Step 2: HTML/Markdown生成] ────────────────────────────────┘
     │  プログラムで変換（Claude API呼び出しなし）
     │  - decorationId → CSSクラス
     │  - boxスキーマ → <div> + .box-title
     │  - paragraphスキーマ → <span>
     │
     ▼
[出力: WordPress HTML or Markdown]
```

---

## 3. データベース設計

### 3.1 テーブル一覧

| テーブル名 | 用途 | パーティションキー | ソートキー |
|-----------|------|------------------|-----------|
| blog-agent-articles | 記事保存 | userId | articleId |
| blog-agent-settings | ユーザー設定 | userId | - |
| blog-agent-jobs | 非同期ジョブ | jobId | - |

### 3.2 articles テーブル

```json
{
  "userId": "string",           // パーティションキー
  "articleId": "string",        // ソートキー (art_xxx)
  "title": "string",
  "markdown": "string",         // 生成コンテンツ（HTML or Markdown）
  "outputFormat": "wordpress|markdown",
  "status": "draft|published",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "metadata": {
    "wordCount": "number",
    "readingTime": "number",
    "targetAudience": "string",
    "keywords": ["string"],
    "generationMethod": "two-step"
  }
}
```

### 3.3 settings テーブル

```json
{
  "userId": "string",           // パーティションキー
  "articleStyle": {
    "taste": "formal|casual|friendly|professional",
    "firstPerson": "watashi|boku|hissha",
    "readerAddress": "anata|minasan|custom",
    "tone": "explanatory|story|qa",
    "introStyle": "problem|empathy|question"
  },
  "decorations": [
    {
      "id": "ba-highlight",
      "label": "ハイライト",
      "roles": ["attention"],
      "schema": "paragraph",
      "class": "ba-highlight",
      "css": "...",
      "enabled": true
    }
  ],
  "seo": {
    "metaDescriptionLength": 140,
    "maxKeywords": 7
  },
  "updatedAt": "timestamp"
}
```

### 3.4 jobs テーブル

```json
{
  "jobId": "string",            // パーティションキー (job_xxx)
  "userId": "string",
  "status": "pending|processing|completed|failed",
  "title": "string",
  "result": { ... },            // 完了時の結果
  "error": "string",            // 失敗時のエラー
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "ttl": "timestamp"            // 24時間後に自動削除
}
```

---

## 4. API仕様

### 4.1 エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | /articles/generate | 記事生成ジョブ投入 |
| GET | /articles/jobs/{jobId} | ジョブステータス取得 |
| POST | /articles/titles | タイトル案生成 |
| POST | /articles/meta | メタ情報生成 |
| GET | /settings | 設定取得 |
| PUT | /settings | 設定保存 |
| POST | /chat/edit | チャット修正 |

### 4.2 認証

- **方式**: Cognito JWT
- **ヘッダー**: `Authorization: Bearer {id_token}`

### 4.3 主要API詳細

#### POST /articles/generate

**リクエスト**:
```json
{
  "title": "記事タイトル",
  "targetAudience": "対象読者",
  "purpose": "記事の目的",
  "keywords": ["キーワード1", "キーワード2"],
  "contentPoints": "記事の内容ポイント",
  "wordCount": 1500,
  "articleType": "info|howto|review",
  "outputFormat": "wordpress|markdown"
}
```

**レスポンス** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "job_xxx",
    "status": "pending"
  }
}
```

#### GET /articles/jobs/{jobId}

**レスポンス** (200 OK - completed):
```json
{
  "success": true,
  "data": {
    "jobId": "job_xxx",
    "status": "completed",
    "result": {
      "articleId": "art_xxx",
      "title": "記事タイトル",
      "markdown": "<!-- wp:heading -->...",
      "outputFormat": "wordpress"
    }
  }
}
```

---

## 5. 装飾システム

### 5.1 装飾一覧（v1.0.0）

| ID | ラベル | スキーマ | ロール | 説明 |
|----|-------|---------|-------|------|
| ba-highlight | ハイライト | paragraph | attention | インライン強調 |
| ba-point | ポイント | box | attention | 重要ポイントボックス |
| ba-warning | 警告 | box | warning | 警告ボックス |
| ba-explain | 補足説明 | box | explain | 補足情報ボックス |
| ba-summary-box | まとめボックス | box | summarize | まとめ用ボックス |
| ba-summary-list | まとめリスト | list | summarize | まとめ用リスト |
| ba-table | 比較テーブル | table | explain | 比較表 |
| ba-callout | アクションボタン | callout | action | CTA |

### 5.2 スキーマ別出力形式

| スキーマ | HTML出力 |
|---------|---------|
| paragraph | `<span class="装飾ID">内容</span>` |
| box | `<div class="装飾ID"><p class="box-title">タイトル</p><p>内容</p></div>` |
| list | `<div class="装飾ID"><ul>...</ul></div>` |

### 5.3 装飾CSS例

```css
.ba-point {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 16px 20px;
  margin: 24px 0;
  border-radius: 0 8px 8px 0;
}
.ba-point .box-title {
  font-weight: 700;
  color: #1976d2;
  margin-bottom: 8px;
  font-size: 14px;
}
```

---

## 6. フロントエンド構成

### 6.1 ディレクトリ構造

```
frontend/src/
├── components/
│   ├── chat/          # チャット修正UI
│   ├── editor/        # エディタコンポーネント
│   ├── layout/        # レイアウト
│   └── ui/            # 共通UIコンポーネント
├── contexts/
│   └── AuthContext.tsx
├── pages/
│   ├── auth/          # 認証ページ
│   ├── articles/      # 記事一覧
│   ├── editor/        # エディタページ
│   ├── generate/      # 記事生成ページ
│   └── settings/      # 設定ページ
├── services/
│   ├── articleApi.ts  # 記事API
│   └── decorationService.ts  # 装飾管理
├── stores/
│   └── settingsStore.ts  # 設定状態管理
└── App.tsx
```

### 6.2 主要ページ

| パス | ページ | 説明 |
|-----|-------|------|
| /login | LoginPage | ログイン |
| /register | RegisterPage | ユーザー登録 |
| /generate | GeneratePage | 記事生成 |
| /articles | ArticlesPage | 記事一覧 |
| /editor/:id | EditorPage | 記事編集 |
| /settings/article | ArticleSettingsPage | 記事設定 |

---

## 7. バックエンド構成

### 7.1 Lambda関数一覧

| 関数名 | ランタイム | 役割 |
|-------|----------|------|
| blog-agent-generate-article | Python 3.11 | 記事生成 |
| blog-agent-chat-edit | Python 3.11 | チャット修正 |
| blog-agent-manage-settings | Python 3.11 | 設定管理 |
| blog-agent-authorizer | Python 3.11 | JWT認証 |

### 7.2 generate-article 構成

```
backend/functions/generate-article/
├── app.py              # メインハンドラー
├── prompt_builder.py   # プロンプト構築
├── sample_articles.py  # サンプル記事
├── utils.py            # ユーティリティ
├── validators.py       # バリデーション
└── requirements.txt    # 依存関係
```

### 7.3 主要関数

| 関数 | ファイル | 説明 |
|-----|---------|------|
| `build_structure_prompt()` | prompt_builder.py | Step1プロンプト構築 |
| `validate_and_filter_decorations()` | app.py | 装飾ID検証 |
| `structure_to_wordpress()` | app.py | WordPress HTML生成 |
| `structure_to_markdown()` | app.py | Markdown生成 |

---

## 8. 環境情報

### 8.1 本番環境（prod）

| リソース | 値 |
|---------|---|
| Frontend | https://d61rr8il37q8l.cloudfront.net |
| API | https://49aiga7ig2.execute-api.ap-northeast-1.amazonaws.com/prod |
| Cognito User Pool | ap-northeast-1_mMPitcdwE |
| Region | ap-northeast-1 |

### 8.2 開発環境（dev）

| リソース | 値 |
|---------|---|
| Frontend | https://d3iztaxemgxo0e.cloudfront.net |
| API | https://t22nn2nbqb.execute-api.ap-northeast-1.amazonaws.com/dev |
| Cognito User Pool | ap-northeast-1_KGCi73tD7 |
| Region | ap-northeast-1 |

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2026-01-29 | 初版作成 |

---

## 10. 改訂手順

本設計書の改訂は以下のプロセスに従う：

1. **変更計画書の作成** - 変更内容、影響範囲、リスクを文書化
2. **承認** - 変更計画書のレビューと承認
3. **設計書更新** - 本設計書の該当箇所を更新
4. **実装** - 設計書に基づいてコードを修正
5. **テスト** - dev環境でテスト
6. **本番デプロイ** - prod環境へデプロイ
7. **バージョン更新** - 変更履歴に記録

詳細は `docs/13_development_workflow.md` を参照。
