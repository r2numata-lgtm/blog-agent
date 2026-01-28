# 変更ログ

**ドキュメントバージョン**: 3.3
**最終更新日**: 2026-01-21
**関連ドキュメント**: 全ドキュメント

---

## 📝 変更履歴

### 2026-01-21: 装飾設定反映問題の修正・詳細設計書追加

**変更内容**

#### 概要
ユーザーが設定した装飾CSSが記事生成に反映されない問題を修正。
複数のバグを特定し、Lambda関数を修正してデプロイ。

#### 修正内容

**1. manage-settings Lambda (handler.py)**

| 問題 | 原因 | 修正 |
|-----|------|-----|
| 設定が保存されない | HTTP API v2でのHTTPメソッド取得方法が違う | `event["requestContext"]["http"]["method"]` を使用 |
| 保存後にエラー | Decimal型がJSONシリアライズできない | `decimal_default()` カスタムエンコーダー追加 |

**2. generate-article Lambda (validators.py)**

| 問題 | 原因 | 修正 |
|-----|------|-----|
| 設定バリデーション失敗 | Decimal型がintチェックに失敗 | `is_int_like()`, `to_int()` ヘルパー関数追加 |

**3. generate-article Lambda (prompt_builder.py)**

| 問題 | 原因 | 修正 |
|-----|------|-----|
| 無効な装飾が使われる | 全roleがプロンプトに含まれていた | 有効なroleのみをプロンプトに含める |

**4. decorationService.ts (フロントエンド)**

| 問題 | 原因 | 修正 |
|-----|------|-----|
| 装飾操作が動作しない | 旧スキーマのバリデーションが失敗 | `ensureNewSchema()` で自動マイグレーション |

#### 新規ドキュメント

- **12_detailed_flow_design.md**: 詳細処理フロー設計書
  - システム全体フロー図
  - 記事生成2段階フローの詳細
  - 設定管理フロー
  - 認証フロー（HTTP API v2対応）
  - Lambda関数一覧
  - トラブルシューティングガイド

#### 開発環境の明確化

- **08_deployment_guide.md** に開発環境方針を追加
  - フロントエンド: ローカル（localhost:5173）
  - バックエンド: AWS dev環境

**影響範囲**
- **frontend/src/services/decorationService.ts** - スキーマ自動マイグレーション
- **backend/functions/manage-settings/handler.py** - HTTP API v2対応、Decimal対応
- **backend/functions/generate-article/validators.py** - Decimal型バリデーション
- **backend/functions/generate-article/prompt_builder.py** - 有効roleのみプロンプト含有
- **docs/08_deployment_guide.md** - 開発環境方針追加
- **docs/12_detailed_flow_design.md** - 新規作成

---

### 2026-01-20: Role/Schema/CSS完全分離アーキテクチャ実装

**変更内容**

#### 概要
装飾の「意味（Role）」「構造（Schema）」「見た目（CSS）」を完全分離するアーキテクチャを実装。
Claudeは「意味と文章」のみを生成し、構造とCSSはシステム側で決定する設計に変更。

#### 新スキーマ仕様

**Role（5種類固定）**
| Role | 説明 |
|------|------|
| attention | 重要な主張・結論 |
| warning | 注意・失敗・リスク |
| summarize | 要点整理・まとめ |
| explain | 解説・定義・補足 |
| action | 行動促進・CTA |

**Schema（6種類）**
| Schema | 説明 | Options |
|--------|------|---------|
| paragraph | 通常段落/インライン | なし |
| box | 囲みボックス | `title: {required, source}` |
| list | 箇条書き | `ordered: boolean` |
| steps | 手順・工程 | `stepTitle: {enabled, source}` |
| table | 比較・整理表 | `headers: {required, source}` |
| callout | CTA専用 | `buttonText: {source}` |

**Role × Schema 制限マトリクス**
```
             paragraph  box  list  steps  table  callout
attention        ✓       ✓    -      -      -       -
warning          ✓       ✓    -      -      -       -
summarize        ✓       ✓    ✓      -      -       -
explain          ✓       ✓    -      -      ✓       -
action           -       -    -      -      -       ✓
```

**新しい装飾定義スキーマ**
```json
{
  "id": "ba-warning",
  "label": "警告",
  "roles": ["warning"],
  "schema": "box",
  "options": { "title": { "required": true, "source": "claude" } },
  "class": "ba-warning",
  "css": "...",
  "enabled": true
}
```

#### フロントエンド修正

**settingsStore.ts**
- 新型定義追加: `DecorationSchema`, `SchemaOptions`, `BoxOptions`, `ListOptions`等
- `ROLE_SCHEMA_CONSTRAINTS`: Role × Schema制限マップ
- `SCHEMA_LABELS`: Schema表示ラベル
- `validateRoleSchemaConstraint()`: 制約検証関数
- `getAvailableSchemasForRoles()`: 利用可能Schema取得関数
- `getDefaultOptionsForSchema()`: Schemaデフォルトオプション
- `DEFAULT_DECORATIONS`: 新スキーマ対応8種類のデフォルト装飾

**ArticleSettingsPage.tsx**
- Schema選択UI追加（Roleに応じて選択肢を制限）
- Schema Options動的UI（schema別の設定項目）
- Role変更時の自動Schema調整とワーニング表示
- 装飾リストにschemaバッジ表示

**decorationService.ts**
- `addCustomDecoration()`: schema/options/class対応
- `saveDecorationSettings()`: 新フィールド対応

#### バックエンド修正

**handler.py（manage-settings Lambda）**
- `VALID_ROLES`, `VALID_SCHEMAS`, `ROLE_SCHEMA_CONSTRAINTS`定数追加
- `validate_decoration()`: 単一装飾のバリデーション
- `validate_decorations()`: リスト全体のバリデーション
- `DEFAULT_SETTINGS`: 新スキーマ対応8種類のデフォルト装飾

**prompt_builder.py**
- `DecorationWithRoles`: schema/options追加
- `DECORATION_SCHEMAS`, `ROLE_SCHEMA_CONSTRAINTS`定義
- `get_decoration_metadata_for_prompt()`: meta要件情報取得
- `build_structure_prompt()`: 新出力形式（type, text, roles, meta）
- `build_output_prompt()`: 新シグネチャ（decorations引数）
- `build_role_schema_to_decoration_map()`: (role, schema)→decorationIdマッピング
- `_build_wordpress_output_prompt_v2()`: 新Gutenberg HTML出力プロンプト

**app.py**
- `get_default_settings()`: 新スキーマ対応
- `process_wordpress_output()`: 新出力形式対応（table, callout追加）
- `process_sqs_message()`: 新`build_output_prompt`シグネチャ対応

#### 2段階記事生成フロー

**Step 1: 構造生成**
```json
{
  "title": "記事タイトル",
  "sections": [
    {
      "heading": "見出し",
      "blocks": [
        {
          "type": "paragraph",
          "text": "本文テキスト",
          "roles": ["warning"],
          "meta": { "title": "注意点" }
        }
      ]
    }
  ]
}
```

**Step 2: HTML変換**
- role + type → decorationId解決
- decoration.schemaに基づきHTML生成
- meta情報（title, buttonText等）を反映

#### 制約ルール
- 同一decorationIdの連続使用は禁止
- 同一roleは1記事最大3回まで
- 対応装飾が存在しないroleは装飾しない
- schema未対応metaは破棄

**影響範囲**
- **frontend/src/stores/settingsStore.ts** - 型定義・バリデーション
- **frontend/src/pages/settings/ArticleSettingsPage.tsx** - 装飾編集UI
- **frontend/src/services/decorationService.ts** - 装飾サービス
- **backend/functions/manage-settings/handler.py** - 設定管理
- **backend/functions/generate-article/prompt_builder.py** - プロンプト構築
- **backend/functions/generate-article/app.py** - 記事生成

---

### 2026-01-19: 装飾role/CSS分離仕様実装（初期版）

**変更内容**

#### 概要
ユーザー設定の装飾CSSが記事生成に反映されない問題を根本解決するため、装飾の「意味（role）」と「見た目（CSS）」を完全分離する仕様を実装。

#### 設計原則
1. **意味（role）と見た目（CSS）の完全分離**
   - Claudeが扱うのは意味（role）のみ
   - CSS / class名 / styleは人間（DB・アプリ側）の責務

2. **固定roleセット**
   - `attention`: 重要な主張・強調
   - `warning`: 注意・失敗・リスク
   - `summarize`: 要点整理・まとめ
   - `explain`: 解説・定義
   - `action`: 行動促進

3. **2段階記事生成フロー**
   - Step 1: 構造生成（Claude API 1回目）- roles付きJSON出力
   - Step 2: 出力生成（Claude API 2回目）- WordPress/Markdown選択式

#### バックエンド修正
- `app.py`:
  - `build_role_to_decoration_map()`: role→decorationIdマッピング生成
  - `process_wordpress_output()`: WordPress JSONブロック→HTML変換
  - `extract_markdown_content()`: Markdown出力抽出
  - Step 2でClaude API呼び出しに変更（従来はプログラム変換）

- `prompt_builder.py`:
  - `build_output_prompt()`: 全面改修
  - `_build_wordpress_output_prompt()`: WordPress用プロンプト
  - `_build_markdown_output_prompt()`: Markdown用プロンプト

#### 制約ルール
- 同一decorationIdの連続使用は禁止
- 同一roleは1記事最大3回まで
- 対応装飾が存在しないroleは装飾しない

**影響範囲**
- **06_backend_design.md** - v2.0に更新、2段階生成フロー追加
- **99_task_management.md** - 装飾role/CSS分離セクション追加

**関連Issue**
- ユーザー設定の装飾CSSが反映されない問題の根本解決

---

### 2026-01-10: Phase 6 Week 18-19完了 - UI/UX改善・本番環境構築

**変更内容**

#### P6-01〜04: UI/UX改善
- 共通UIコンポーネントライブラリ作成（components/ui/）
  - Button: バリアント、サイズ、ローディング状態
  - Input: ラベル、エラー表示、アイコン対応
  - Card: ヘッダー、コンテンツ、フッター、統計カード
  - Alert: 4タイプ（success/error/warning/info）
  - Loading: スピナー、スケルトン、プログレス
  - Modal: 確認ダイアログ、フォーカストラップ
  - Toast: 通知システム（ToastProvider）
  - Tutorial: ステップガイド、ウェルカムモーダル
- LoginPage UI刷新（グラデーション背景、カードデザイン）
- Cognito エラーメッセージの日本語化

#### P6-05〜08: 本番環境構築
- CloudFormationテンプレート作成（infra/cloudformation.yaml）
  - S3 + CloudFront（フロントエンドホスティング）
  - API Gateway HTTP API
  - DynamoDB（Articles, Settings, Conversations）
  - Lambda実行ロール
- GitHub Actions CI/CD作成
  - ci.yml: Lint、ユニットテスト、E2Eテスト
  - deploy.yml: CloudFormation、S3、Lambda デプロイ
- モニタリング設定（infra/monitoring.yaml）
  - CloudWatchアラーム（5xx, Latency, Lambda Errors）
  - CloudWatchダッシュボード
  - SNS通知トピック
- バックアップ設定
  - AWS Backup Vault
  - 日次/週次バックアップ

**影響範囲**
- **00_project_overview.md** - v3.0に更新、進捗状況追加
- **08_deployment_guide.md** - v2.0に更新、実装内容を反映
- **99_task_management.md** - P6-01〜P6-08を完了に更新

---

### 2026-01-10: Phase 5 Week 17完了 - 統合テスト

**変更内容**

#### P5-09〜12: 統合テスト
- テスト環境構築
  - Vitest + jsdom（ユニットテスト）
  - Playwright（E2Eテスト）
  - vitest.config.ts, playwright.config.ts作成
- ユニットテスト作成（30件）
  - exportUtils.test.ts（11件）
  - articleStorage.test.ts（19件）
- E2Eテスト作成（9ファイル）
  - auth.spec.ts: 認証フロー
  - navigation.spec.ts: ナビゲーション
  - articles.spec.ts: 記事管理
  - editor.spec.ts: エディタ
  - generate.spec.ts: 記事生成
  - settings.spec.ts: 設定
  - performance.spec.ts: パフォーマンス
  - security.spec.ts: セキュリティ
  - browser-compatibility.spec.ts: ブラウザ互換性

**技術的な発見**
- localStorage モックは Object.defineProperty で設定が必要
- テストファイルは tsconfig.app.json の exclude に追加が必要

**影響範囲**
- **frontend/package.json** - テストスクリプト追加
- **frontend/vitest.config.ts** - 新規作成
- **frontend/playwright.config.ts** - 新規作成
- **frontend/tsconfig.app.json** - exclude設定追加
- **99_task_management.md** - P5-09〜P5-12を完了に更新

---

### 2026-01-09: Phase 4・5完了 - Gutenbergエディタ・出力機能・記事管理

**変更内容**

#### Phase 4: Gutenbergエディタ（P4-01〜P4-16）
- エディタ基盤
  - GutenbergEditor.tsx: 本格的なブロックエディタ
  - EditorPage.tsx: エディタページ
  - BlockEditorProvider統合
- ブロック実装
  - 基本: paragraph, heading, list, quote
  - 装飾: group, columns, table, separator
  - カスタム: blog-agent/box, blog-agent/balloon
- プレビュー機能
  - リアルタイムプレビュー
  - WordPressテーマ風スタイル
  - レスポンシブ切り替え（PC/タブレット/モバイル）
- ブロック操作
  - ドラッグ&ドロップ並び替え
  - ブロック追加メニュー
  - 設定パネル（BlockInspector）
  - 履歴管理、キーボードショートカット

#### Phase 5 Week 15-16: 出力機能・記事管理（P5-01〜P5-08）
- エクスポート機能
  - exportUtils.ts
  - Gutenbergブロック形式、HTML、JSON出力
- 記事管理
  - articleStorage.ts: LocalStorage管理
  - ArticlesPage.tsx: 記事一覧ページ
  - 検索・フィルタ・ソート機能

**影響範囲**
- **99_task_management.md** - Phase 4, 5を完了に更新

---

### 2026-01-07: Phase 2・3完了 - 記事生成・チャット修正

**変更内容**

#### Phase 2: 記事生成コア（P2-01〜P2-16）
- プロンプト設計
  - prompt_builder.py: プロンプト構築
  - スタイル/サンプル記事/内部リンクの反映
- 記事生成Lambda
  - app.py: generate_article, generate_titles, generate_meta
  - validators.py: 入力検証
  - utils.py: ユーティリティ
- フロントエンド
  - GeneratePage.tsx: 記事生成フォーム
  - markdownToBlocks.ts: Gutenbergブロック変換
  - customBlocks.ts: カスタムブロック定義
- 統合テスト・エラーハンドリング
  - ErrorBoundary.tsx
  - errorHandler.ts（リトライ機能付き）

#### Phase 3: チャット修正（P3-01〜P3-12）
- チャット基盤
  - chat-edit Lambda関数
  - DynamoDB conversations テーブル
  - diff_utils.py: 差分検出・適用
- チャットUI
  - ChatPanel.tsx, ChatInput.tsx, ChatHistory.tsx
  - ChatMessage.tsx: 個別メッセージ
- 修正履歴
  - DiffViewer.tsx: 差分表示
  - RevisionList.tsx: リビジョン管理
  - 最大10件の履歴保存

**影響範囲**
- **99_task_management.md** - Phase 2, 3を完了に更新

---

### 2026-01-07: Phase 1完了 - 認証・初期設定

**変更内容**

#### Week 2: 認証基盤（P1-01〜P1-04）
- Cognito User Pool作成
  - Pool ID: ap-northeast-1_NhI2bZRA1
  - App Client作成
- 認証画面実装
  - LoginPage, RegisterPage, ConfirmPage
  - cognito.ts: 認証サービス
  - AuthContext.tsx: 認証状態管理
- JWT認証フロー
  - トークン自動リフレッシュ
  - Lambda Authorizer
- パスワードリセット機能

#### Week 3: 記事初期設定（P1-05〜P1-09）
- 記事スタイル設定画面
  - テイスト/一人称/読者呼びかけ/トーン
- サンプル記事アップロード
  - HTML/Markdownファイル対応
- 装飾プリセット設定
  - ボックス/吹き出し/引用のON/OFF
  - SEO設定
- 設定保存API
  - manage-settings Lambda
  - Zustandストア + localStorage永続化

**影響範囲**
- **99_task_management.md** - Phase 1を完了に更新

---

### 2026-01-04: Phase 0完了 - Gutenberg技術検証

**変更内容**
- P0-06タスク完了
- Gutenberg関連パッケージのインストールと動作確認
- React 18へのダウングレード（Gutenberg互換性のため）
- 検証用コンポーネント（GutenbergTest.tsx）の作成
- 9つの検証項目すべてクリア

**検証結果**
- Gutenbergライブラリは Blog Agent で使用可能
- createBlock, serialize関数で簡単にブロック生成・変換可能
- WordPress形式のHTMLコメントが自動生成される

**影響範囲**
- **frontend/package.json** - React 18ダウングレード
- **99_task_management.md** - Phase 0が100%完了

---

### 2026-01-03: 戦略的ピボット - MVPから本格開発へ

**変更内容**
開発アプローチを全面的に見直し

**主要な変更点:**
1. **出力形式**: Markdown/HTML → Gutenbergブロック形式
2. **記事修正**: 手動編集のみ → チャットベースの対話的修正
3. **記事統一感**: なし → 初期設定でスタイル・サンプル記事・装飾プリセット
4. **開発期間**: 3ヶ月 → 4-5ヶ月
5. **開発費用**: $396 → $905

**影響範囲**
- 全ドキュメントの全面改訂（v2.0）
- タスク管理の再構成

---

### 2024-12-03: プロジェクト初期化

**変更内容**
- 全モジュールドキュメント（12ファイル）の初版作成
- プロジェクト構成の決定

---

## 🔄 変更管理プロセス

### 変更が必要な場合

1. **このファイル（10_change_log.md）に変更内容を記録**
   - 日付、変更内容、理由、影響範囲を明記

2. **影響を受けるドキュメントを特定**
   - 依存関係マップを確認
   - 関連ドキュメントをリストアップ

3. **該当ドキュメントを更新**
   - 変更内容を反映
   - ドキュメントバージョンを更新

4. **タスク管理に反映**
   - 99_task_management.md を更新
   - 必要に応じて新規タスク追加

5. **Gitにコミット**
   - 変更理由を明記
   - 関連Issue番号を記載

---

## 📊 プロジェクト進捗サマリー

### Phase別完了状況（2026-01-10時点）

| Phase | 期間 | タスク | 完了 | 進捗 |
|-------|------|--------|------|------|
| Phase 0: セットアップ | Week 1 | 6 | 6 | 100% |
| Phase 1: 認証・初期設定 | Week 2-3 | 9 | 9 | 100% |
| Phase 2: 記事生成コア | Week 4-7 | 16 | 16 | 100% |
| Phase 3: チャット修正 | Week 8-10 | 12 | 12 | 100% |
| Phase 4: Gutenbergエディタ | Week 11-14 | 16 | 16 | 100% |
| Phase 5: 統合・テスト | Week 15-17 | 12 | 12 | 100% |
| Phase 6: リリース | Week 18-20 | 13 | 8 | 62% |
| **合計** | | **84** | **79** | **94%** |

### 主要マイルストーン

- [x] 2026-01-03: プロジェクト開始
- [x] 2026-01-04: Phase 0完了（技術検証）
- [x] 2026-01-07: Phase 1-3完了（認証、記事生成、チャット修正）
- [x] 2026-01-09: Phase 4-5完了（エディタ、出力、記事管理）
- [x] 2026-01-10: Phase 6 Week 18-19完了（UI/UX、本番環境）
- [ ] Phase 6 Week 20: 最終準備・リリース

---

## 🔗 関連ドキュメント

全ドキュメント

---

**最終更新**: 2026-01-10
**次回レビュー**: リリース後
