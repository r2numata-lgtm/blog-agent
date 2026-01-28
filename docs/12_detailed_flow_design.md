# 詳細処理フロー設計書

**ドキュメントバージョン**: 1.0
**最終更新日**: 2026-01-21
**関連ドキュメント**: 06_backend_design.md, 04_api_specification.md

---

## 1. システム全体フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Blog Agent システム全体図                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │  Frontend    │────▶│ API Gateway  │────▶│  Lambda Functions            │ │
│  │  (React)     │◀────│  (HTTP API)  │◀────│  - generate-article          │ │
│  │  localhost   │     │  v2          │     │  - manage-settings           │ │
│  │  :5173       │     │              │     │  - chat-edit                 │ │
│  └──────────────┘     └──────────────┘     │  - authorizer                │ │
│        │                    │              └──────────────────────────────┘ │
│        │                    │                       │                        │
│        ▼                    ▼                       ▼                        │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │ localStorage │     │   Cognito    │     │  DynamoDB Tables             │ │
│  │ (設定キャッシュ)│     │  (認証)      │     │  - settings-dev              │ │
│  └──────────────┘     └──────────────┘     │  - articles-dev              │ │
│                                            │  - jobs-dev                  │ │
│                                            └──────────────────────────────┘ │
│                                                     │                        │
│                                                     ▼                        │
│                                            ┌──────────────────────────────┐ │
│                                            │  Claude API                  │ │
│                                            │  (Anthropic)                 │ │
│                                            └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 記事生成フロー（詳細）

### 2.1 概要シーケンス

```
Frontend          API Gateway       Lambda              DynamoDB         Claude API
   │                  │               │                    │                │
   │ POST /articles/generate          │                    │                │
   │─────────────────▶│               │                    │                │
   │                  │ submit_job    │                    │                │
   │                  │──────────────▶│                    │                │
   │                  │               │ create job         │                │
   │                  │               │───────────────────▶│                │
   │                  │               │                    │                │
   │  202 {jobId}     │◀──────────────│                    │                │
   │◀─────────────────│               │                    │                │
   │                  │               │ SQS trigger        │                │
   │                  │               │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─│                │
   │                  │               │                    │                │
   │                  │               │ get_user_settings  │                │
   │                  │               │───────────────────▶│                │
   │                  │               │◀───────────────────│                │
   │                  │               │                    │                │
   │                  │               │ Step 1: 構造生成    │                │
   │                  │               │───────────────────────────────────▶│
   │                  │               │◀───────────────────────────────────│
   │                  │               │                    │                │
   │                  │               │ Step 2: 出力生成    │                │
   │                  │               │───────────────────────────────────▶│
   │                  │               │◀───────────────────────────────────│
   │                  │               │                    │                │
   │                  │               │ save article       │                │
   │                  │               │───────────────────▶│                │
   │                  │               │ update job status  │                │
   │                  │               │───────────────────▶│                │
   │                  │               │                    │                │
   │ GET /articles/jobs/{jobId} (polling)                  │                │
   │─────────────────▶│──────────────▶│───────────────────▶│                │
   │◀─────────────────│◀──────────────│◀───────────────────│                │
   │                  │               │                    │                │
```

### 2.2 Step 1: 構造生成（詳細）

**目的**: 記事の意味構造（セクション、ブロック、roles）をJSON形式で生成

**入力データ**:
```python
{
    "title": "記事タイトル",
    "targetAudience": "対象読者",
    "purpose": "記事の目的",
    "keywords": ["キーワード1", "キーワード2"],
    "contentPoints": "本文の要点",
    "wordCount": 3000,
    "articleType": "info" | "howto" | "review"
}
```

**プロンプトに含める情報**:
1. ユーザー入力（上記）
2. 文体設定（articleStyle）
3. **有効な装飾のroleのみ**（重要な修正点）
4. サンプル記事（あれば）

**プロンプト生成フロー**:
```
get_user_settings(user_id)
    │
    ▼
settings.decorations（配列）
    │
    ▼
get_available_roles(decorations)
  └─▶ enabled=true の装飾からrolesを抽出
    │
    ▼
get_decoration_metadata_for_prompt(decorations)
  └─▶ 有効な装飾のメタデータを生成
    │
    ▼
build_structure_prompt()
  └─▶ 有効なroleのみをプロンプトに含める
      （無効なroleは使用禁止と明記）
```

**出力（Claude応答）**:
```json
{
  "title": "記事タイトル",
  "sections": [
    {
      "heading": "セクション見出し",
      "blocks": [
        {
          "type": "paragraph",
          "roles": ["attention"],
          "content": "本文テキスト",
          "meta": { "title": "ポイント" }
        }
      ]
    }
  ]
}
```

### 2.3 Step 2: 出力生成（詳細）

**目的**: Step 1の構造JSONを最終出力形式（WordPress/Markdown）に変換

**role → decorationId マッピング**:
```python
build_role_schema_to_decoration_map(decorations)
    │
    ▼
{
  "attention": {
    "paragraph": "ba-highlight",
    "box": "ba-point"
  },
  "summarize": {
    "list": "ba-checklist"  # カスタム装飾の例
  }
}
```

**マッピングルール**:
1. `enabled=true` の装飾のみマッピングに含める
2. 同じ(role, schema)の組み合わせは最初に見つかったものを使用
3. マッピングにない組み合わせは装飾なしで出力

**出力形式別の処理**:

| 出力形式 | 処理内容 |
|---------|---------|
| WordPress | Gutenberg HTMLブロック形式で出力、decorationId → class変換 |
| Markdown | 標準Markdown形式（装飾なし） |

---

## 3. 設定管理フロー

### 3.1 設定の保存・読み込み

```
┌─────────────────────────────────────────────────────────────────┐
│                       設定管理フロー                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Frontend: 設定変更]                                            │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────────┐                                        │
│  │ settingsStore       │  ◀─── Zustand + persist                │
│  │ (localStorage即時保存)│                                        │
│  └─────────────────────┘                                        │
│        │                                                         │
│        │ 「設定を保存」ボタン押下                                  │
│        ▼                                                         │
│  ┌─────────────────────┐     ┌─────────────────────┐           │
│  │ PUT /settings       │────▶│ manage-settings     │           │
│  │                     │     │ Lambda              │           │
│  └─────────────────────┘     └─────────────────────┘           │
│                                      │                          │
│                                      ▼                          │
│                              ┌─────────────────────┐           │
│                              │ DynamoDB            │           │
│                              │ settings-dev        │           │
│                              └─────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 装飾設定のスキーマ（新スキーマ）

```typescript
interface DecorationWithRoles {
  id: string;           // "ba-highlight", "ba-point", etc.
  label: string;        // "ハイライト", "ポイント"
  roles: SemanticRole[]; // ["attention"], ["summarize"]
  schema: DecorationSchema; // "paragraph", "box", "list", etc.
  options: SchemaOptions;
  class: string;        // CSSクラス名
  css: string;          // CSSスタイル定義
  enabled: boolean;     // 有効/無効フラグ ★重要
}

type SemanticRole = "attention" | "warning" | "summarize" | "explain" | "action";
type DecorationSchema = "paragraph" | "box" | "list" | "steps" | "table" | "callout";
```

### 3.3 DynamoDB データ形式の注意点

| フィールド | DynamoDB型 | Python型 | 注意点 |
|-----------|-----------|---------|--------|
| 数値 | N | Decimal | intバリデーション時は `is_int_like()` を使用 |
| 真偽値 | BOOL | bool | そのまま使用可能 |
| 文字列 | S | str | そのまま使用可能 |
| リスト | L | list | そのまま使用可能 |

---

## 4. 認証フロー

### 4.1 API Gateway HTTP API v2 での認証

```
┌─────────────────────────────────────────────────────────────────┐
│                       認証フロー                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Frontend]                                                      │
│      │                                                           │
│      │ Authorization: Bearer {idToken}                          │
│      ▼                                                           │
│  ┌─────────────────────┐                                        │
│  │ API Gateway         │                                        │
│  │ HTTP API v2         │                                        │
│  └─────────────────────┘                                        │
│      │                                                           │
│      │ Lambda Authorizer                                        │
│      ▼                                                           │
│  ┌─────────────────────┐                                        │
│  │ authorizer Lambda   │                                        │
│  │ - JWT検証           │                                        │
│  │ - userId抽出        │                                        │
│  └─────────────────────┘                                        │
│      │                                                           │
│      │ context: { userId: "xxx" }                               │
│      ▼                                                           │
│  ┌─────────────────────┐                                        │
│  │ Target Lambda       │                                        │
│  │ (generate-article等)│                                        │
│  └─────────────────────┘                                        │
│                                                                  │
│  ★ HTTP API v2でのユーザーID取得方法:                            │
│    event["requestContext"]["authorizer"]["lambda"]["userId"]    │
│                                                                  │
│  ★ HTTPメソッド取得方法:                                         │
│    event["requestContext"]["http"]["method"]                    │
│    （event["httpMethod"] は HTTP API v2では使用不可）            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Lambda関数一覧

### 5.1 generate-article

| 項目 | 内容 |
|-----|------|
| 関数名 | blog-agent-generate-article-dev |
| ハンドラ | app.lambda_handler |
| トリガー | API Gateway, SQS |
| 主要機能 | 記事生成、タイトル生成、メタ情報生成 |

**主要ファイル**:
- `app.py`: メインハンドラ、API振り分け
- `prompt_builder.py`: プロンプト生成ロジック
- `validators.py`: 入力・設定バリデーション
- `utils.py`: ユーティリティ関数
- `sample_articles.py`: サンプル記事データ

**エンドポイント**:
| メソッド | パス | 機能 |
|---------|-----|------|
| POST | /articles/generate | 記事生成ジョブ投入 |
| GET | /articles/jobs/{jobId} | ジョブステータス取得 |
| POST | /articles/generate/titles | タイトル案生成 |
| POST | /articles/generate/meta | メタ情報生成 |

### 5.2 manage-settings

| 項目 | 内容 |
|-----|------|
| 関数名 | blog-agent-manage-settings-dev |
| ハンドラ | handler.handler |
| トリガー | API Gateway |
| 主要機能 | ユーザー設定の取得・保存 |

**エンドポイント**:
| メソッド | パス | 機能 |
|---------|-----|------|
| GET | /settings | 設定取得 |
| PUT | /settings | 設定保存 |

---

## 6. 重要な実装ポイント

### 6.1 装飾設定の反映条件

装飾が記事に反映されるには、以下の条件をすべて満たす必要がある:

1. **設定がDynamoDBに保存されている**
   - フロントエンドで「設定を保存」ボタンを押す
   - localStorage保存だけでは不十分

2. **装飾がenabled=trueである**
   - 無効な装飾はマッピングに含まれない

3. **Step 1でClaudeが該当roleを使用する**
   - 有効なroleのみがプロンプトに含まれる
   - Claudeは提示されたroleの中から選択

4. **Step 2でマッピングが存在する**
   - (role, schema)の組み合わせがマッピングに存在

### 6.2 バリデーション注意点

DynamoDBから取得した数値は`Decimal`型になるため、バリデーション時は:
```python
def is_int_like(value) -> bool:
    if isinstance(value, int):
        return True
    if isinstance(value, Decimal):
        return value % 1 == 0
    return False
```

### 6.3 JSONシリアライズ注意点

DynamoDBのDecimal型はそのままJSONシリアライズできないため:
```python
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(...)

json.dumps(body, default=decimal_default)
```

---

## 7. トラブルシューティング

### 7.1 装飾が反映されない場合

1. **DynamoDBの設定を確認**
   ```bash
   aws dynamodb scan --table-name blog-agent-settings-dev
   ```

2. **CloudWatchログで装飾ステータスを確認**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/blog-agent-generate-article-dev \
     --filter-pattern "Decorations status"
   ```

3. **確認ポイント**:
   - `enabled_count`: 有効な装飾の数
   - `disabled_count`: 無効な装飾の数
   - `enabled_decorations`: 有効な装飾の詳細

### 7.2 設定が保存されない場合

1. **API応答を確認**
   - `success: true` なのにデータがない → Lambda内部エラー

2. **CloudWatchログを確認**
   - Decimalシリアライズエラー
   - HTTPメソッド取得エラー（HTTP API v2対応）

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2026-01-21 | 1.0 | 初版作成 |
