# Blog Agent - ブログ生成エージェント

ClaudeとAWSを活用した、ブログ記事生成支援Webアプリケーション

## プロジェクト概要

詳細は [docs/00_project_overview.md](docs/00_project_overview.md) を参照

## ドキュメント

- [要件定義](docs/01_requirements.md)
- [システムアーキテクチャ](docs/02_architecture.md)
- [タスク管理](docs/99_task_management.md)

## 開発スケジュール

- Phase 0: 初期セットアップ（Week 1）
- Phase 1: プロトタイプ（Week 2-3）
- Phase 2: フロントエンド（Week 4-6）
- Phase 3: バックエンド（Week 7-9）
- Phase 4: 統合テスト（Week 10-11）
- Phase 5: リリース（Week 12）

## 技術スタック

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: AWS Lambda (Python/Node.js) + API Gateway
- **Database**: DynamoDB
- **Auth**: AWS Cognito
- **AI**: Claude API (Anthropic)
- **Infrastructure**: AWS (S3, CloudFront, etc.)

## セットアップ

詳細は [docs/08_deployment_guide.md](docs/08_deployment_guide.md) を参照
