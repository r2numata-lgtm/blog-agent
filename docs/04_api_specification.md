# API仕様書

**ドキュメントバージョン**: 1.0  
**最終更新日**: 2024-12-03  
**関連ドキュメント**: 02_architecture.md, 06_backend_design.md

---

## 📋 API概要

ブログ生成エージェントのREST API仕様を定義します。

### ベースURL
```
開発環境: https://dev-api.blog-agent.com
本番環境: https://api.blog-agent.com
```

### 共通仕様

#### 認証方式
```
Authorization: Bearer <JWT_TOKEN>
```

#### リクエストヘッダー
```
Content-Type: application/json
Authorization: Bearer <token>
```

#### レスポンス形式
```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

#### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

---

## 🔐 認証API

### POST /auth/signup
新規ユーザー登録

**リクエスト**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**レスポンス** (201 Created)
```json
{
  "success": true,
  "data": {
    "userId": "a1b2c3d4-e5f6-...",
    "email": "user@example.com",
    "message": "認証メールを送信しました"
  }
}
```

---

### POST /auth/login
ログイン

**リクエスト**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "user": {
      "userId": "a1b2c3d4-e5f6-...",
      "email": "user@example.com",
      "plan": "free"
    }
  }
}
```

---

## 📝 記事API

### POST /articles/generate
記事生成

**リクエスト**
```json
{
  "title": "Reactの基本を学ぶ",
  "targetAudience": "初心者",
  "purpose": "学習",
  "keywords": ["React", "JavaScript"],
  "contentPoints": "コンポーネント、State、Props について説明...",
  "wordCount": 1500
}
```

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "articleId": "art-20241203-001",
    "markdown": "# Reactの基本を学ぶ\n\n...",
    "metadata": {
      "wordCount": 1502,
      "generationTime": 25.5
    }
  }
}
```

---

### GET /articles
記事一覧取得

**クエリパラメータ**
```
limit: 20 (デフォルト)
offset: 0 (デフォルト)
sortBy: createdAt (createdAt / updatedAt)
order: desc (desc / asc)
```

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "articleId": "art-20241203-001",
        "title": "Reactの基本を学ぶ",
        "status": "draft",
        "wordCount": 1502,
        "createdAt": 1701648000,
        "updatedAt": 1701648000
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### GET /articles/{articleId}
記事詳細取得

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "articleId": "art-20241203-001",
    "title": "Reactの基本を学ぶ",
    "markdown": "# Reactの基本を学ぶ\n\n...",
    "html": "<h1>Reactの基本を学ぶ</h1>...",
    "status": "draft",
    "metadata": {
      "wordCount": 1502,
      "targetAudience": "初心者",
      "keywords": ["React", "JavaScript"]
    },
    "decorations": ["box-info", "balloon-left"],
    "createdAt": 1701648000,
    "updatedAt": 1701648000
  }
}
```

---

### PUT /articles/{articleId}
記事更新

**リクエスト**
```json
{
  "title": "Reactの基本を学ぶ（改訂版）",
  "markdown": "# Reactの基本を学ぶ\n\n...",
  "status": "draft"
}
```

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "articleId": "art-20241203-001",
    "updatedAt": 1701648100
  }
}
```

---

### DELETE /articles/{articleId}
記事削除

**レスポンス** (204 No Content)

---

### POST /articles/{articleId}/convert
Markdown → HTML変換

**リクエスト**
```json
{
  "includeCSS": true
}
```

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "html": "<html>...</html>",
    "css": ".box-info { ... }"
  }
}
```

---

## 🎨 装飾API

### GET /decorations
装飾一覧取得

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "decorations": [
      {
        "decorationId": "box-info",
        "type": "box",
        "name": "情報ボックス",
        "css": ".box-info { ... }",
        "isDefault": true
      }
    ]
  }
}
```

---

## ⚙️ ユーザー設定API

### GET /users/me
自分の情報取得

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "a1b2c3d4-e5f6-...",
    "email": "user@example.com",
    "plan": "free",
    "settings": {
      "theme": "light",
      "editorFontSize": 14
    },
    "statistics": {
      "totalArticles": 25,
      "totalWords": 37500
    }
  }
}
```

---

### PUT /users/me/settings
設定更新

**リクエスト**
```json
{
  "theme": "dark",
  "editorFontSize": 16,
  "autoSave": true
}
```

**レスポンス** (200 OK)
```json
{
  "success": true,
  "data": {
    "settings": {
      "theme": "dark",
      "editorFontSize": 16,
      "autoSave": true
    }
  }
}
```

---

## 📊 エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| AUTH_001 | 401 | 認証トークンが無効 |
| AUTH_002 | 401 | トークンの有効期限切れ |
| AUTH_003 | 403 | 権限がありません |
| VALIDATION_001 | 400 | 入力値が不正 |
| ARTICLE_001 | 404 | 記事が見つかりません |
| ARTICLE_002 | 429 | 生成回数の上限に達しました |
| SERVER_001 | 500 | サーバーエラー |
| CLAUDE_001 | 503 | Claude API エラー |

---

**関連**: 06_backend_design.md, 09_testing_strategy.md
