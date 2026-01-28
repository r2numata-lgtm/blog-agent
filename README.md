# Blog Agent

Claude APIを活用したブログ記事生成Webアプリケーション

**バージョン**: 1.0.0
**ステータス**: 本番稼働中

---

## 概要

Blog Agentは、2段階生成システムにより高品質なブログ記事を自動生成するWebアプリケーションです。

### 主要機能

- 2段階記事生成（構造生成 → HTML/Markdown変換）
- 8種類の装飾プリセット（on/off切り替え）
- WordPress Gutenberg / Markdown出力
- チャットによる記事修正

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | AWS Lambda (Python 3.11) |
| Database | Amazon DynamoDB |
| Auth | Amazon Cognito |
| AI | Claude API (Anthropic) |
| CDN | Amazon CloudFront |

---

## ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [システム設計書](docs/01_system_design.md) | アーキテクチャ、API仕様、DB設計 |
| [デプロイガイド](docs/08_deployment_guide.md) | 環境構築・デプロイ手順 |
| [処理フロー設計](docs/12_detailed_flow_design.md) | 2段階生成の詳細フロー |
| [開発フロー](docs/13_development_workflow.md) | ブランチ戦略・運用ルール |

---

## 環境

| 環境 | Frontend | API |
|-----|----------|-----|
| 本番 | https://d61rr8il37q8l.cloudfront.net | https://49aiga7ig2.execute-api.ap-northeast-1.amazonaws.com/prod |
| 開発 | https://d3iztaxemgxo0e.cloudfront.net | https://t22nn2nbqb.execute-api.ap-northeast-1.amazonaws.com/dev |

---

## 開発プロセス（ウォーターフォール型）

本プロジェクトでは、品質と追跡可能性を確保するためウォーターフォール型の開発プロセスを採用しています。

### 変更フロー

```
1. 変更計画
   └── 変更内容、影響範囲、リスクを文書化

2. 承認
   └── 計画書のレビューと承認

3. 設計書更新
   └── docs/01_system_design.md を更新

4. 実装
   └── 設計書に基づいてコードを修正

5. テスト
   └── dev環境でテスト

6. 本番デプロイ
   └── prod環境へデプロイ

7. バージョン更新
   └── タグ作成、設計書の変更履歴更新
```

### 重要ルール

- **設計書なしの実装禁止** - 必ず設計書を先に更新
- **承認なしの変更禁止** - 変更計画書のレビュー必須
- **mainへの直接push禁止** - 必ずPR経由

---

## ディレクトリ構成

```
blog-agent/
├── backend/
│   └── functions/
│       ├── generate-article/   # 記事生成Lambda
│       ├── chat-edit/          # チャット修正Lambda
│       ├── manage-settings/    # 設定管理Lambda
│       └── authorizer/         # JWT認証Lambda
├── frontend/
│   └── src/
│       ├── components/         # UIコンポーネント
│       ├── pages/              # ページコンポーネント
│       ├── services/           # API・サービス
│       └── stores/             # 状態管理
├── infra/
│   └── cloudformation.yaml     # AWSインフラ定義
├── scripts/
│   └── deploy.sh               # デプロイスクリプト
└── docs/                       # ドキュメント
```

---

## クイックスタート

### デプロイ

```bash
# 開発環境へデプロイ
./scripts/deploy.sh dev

# 本番環境へデプロイ（mainブランチのみ）
./scripts/deploy.sh prod
```

### ローカル開発

```bash
# フロントエンド
cd frontend
npm install
npm run dev

# バックエンド（API接続はdev環境を使用）
```

---

## ブランチ戦略

| ブランチ | 用途 | デプロイ先 |
|---------|------|-----------|
| main | 本番（直接push禁止） | prod |
| develop | 検証 | dev |
| feature/* | 機能開発 | dev（手動） |

詳細は [開発フロー](docs/13_development_workflow.md) を参照。

---

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2026-01-29 | 初回リリース |

---

## ライセンス

Private - All rights reserved
