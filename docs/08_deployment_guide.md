# デプロイガイド

**ドキュメントバージョン**: 2.0
**最終更新日**: 2026-01-10
**関連ドキュメント**: 02_architecture.md

---

## 🚀 デプロイ概要

このドキュメントでは、ブログ生成エージェントのデプロイ手順を説明します。

### デプロイ環境
- **ステージング環境（staging）**: テスト用
- **本番環境（production）**: 実ユーザー向け

### デプロイ方式
- **インフラ**: CloudFormation（IaC）
- **CI/CD**: GitHub Actions
- **モニタリング**: CloudWatch
- **バックアップ**: AWS Backup

---

## 📋 前提条件

### 必要なツール
```bash
# AWS CLI
aws --version  # 2.0以上

# Node.js
node --version  # 20.x

# Python
python --version  # 3.12
```

### AWS認証情報設定
```bash
aws configure
# AWS Access Key ID: XXXXX
# AWS Secret Access Key: XXXXX
# Default region: ap-northeast-1
# Default output format: json
```

### GitHub Secrets設定
以下のシークレットをGitHubリポジトリに設定：
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### GitHub Variables設定
以下の変数をGitHubリポジトリに設定：
- `VITE_API_URL`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`

---

## 🏗️ インフラストラクチャ

### CloudFormationスタック構成

#### メインスタック（infra/cloudformation.yaml）
- S3バケット（フロントエンドホスティング）
- CloudFrontディストリビューション
- API Gateway HTTP API
- DynamoDBテーブル（Articles, Settings, Conversations）
- Lambda実行ロール
- CloudWatch Logs

#### モニタリングスタック（infra/monitoring.yaml）
- CloudWatchアラーム
- CloudWatchダッシュボード
- SNS通知トピック
- AWS Backupボールト・プラン

### 手動デプロイ手順

**1. メインスタックのデプロイ**
```bash
aws cloudformation deploy \
  --template-file infra/cloudformation.yaml \
  --stack-name blog-agent-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset
```

**2. モニタリングスタックのデプロイ**
```bash
aws cloudformation deploy \
  --template-file infra/monitoring.yaml \
  --stack-name blog-agent-monitoring-production \
  --parameter-overrides \
    Environment=production \
    AlertEmail=your-email@example.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset
```

**3. スタック出力の確認**
```bash
aws cloudformation describe-stacks \
  --stack-name blog-agent-production \
  --query 'Stacks[0].Outputs'
```

---

## 🔄 CI/CDパイプライン

### GitHub Actions ワークフロー

#### CI（継続的インテグレーション）
ファイル: `.github/workflows/ci.yml`

トリガー:
- mainブランチへのpush
- developブランチへのpush
- main/developへのPull Request

実行内容:
1. **lint-and-test**: Lint、ユニットテスト、ビルド
2. **e2e-test**: Playwright E2Eテスト
3. **backend-test**: Python バックエンドテスト

#### Deploy（継続的デプロイメント）
ファイル: `.github/workflows/deploy.yml`

トリガー:
- mainブランチへのpush
- 手動実行（workflow_dispatch）

実行内容:
1. **deploy-infrastructure**: CloudFormationスタックデプロイ
2. **build-and-deploy-frontend**: フロントエンドビルド・S3デプロイ
3. **deploy-backend**: Lambda関数デプロイ
4. **notify-deployment**: デプロイサマリー出力

### 手動でのデプロイ実行

GitHubリポジトリの「Actions」タブから:
1. 「Deploy」ワークフローを選択
2. 「Run workflow」をクリック
3. 環境（production/staging）を選択
4. 「Run workflow」を実行

---

## 🎨 フロントエンドデプロイ

### 自動デプロイ（推奨）
mainブランチへのpushで自動デプロイされます。

### 手動デプロイ

**1. ビルド**
```bash
cd frontend
npm install
npm run build
```

**2. S3にアップロード**
```bash
# バケット名を取得
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name blog-agent-production \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

# アセットファイル（長期キャッシュ）
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.json"

# index.html（キャッシュなし）
aws s3 cp dist/index.html s3://$BUCKET_NAME/ \
  --cache-control "public, max-age=0, must-revalidate"
```

**3. CloudFrontキャッシュクリア**
```bash
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name blog-agent-production \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

---

## ⚙️ バックエンドデプロイ

### Lambda関数のデプロイ

**1. 依存関係のインストール**
```bash
cd backend
pip install -r requirements.txt -t lambda_package/
```

**2. ソースコードのコピー**
```bash
cp -r lambda/* lambda_package/
```

**3. デプロイパッケージの作成**
```bash
cd lambda_package
zip -r ../deployment.zip .
cd ..
```

**4. Lambda関数の更新**
```bash
for func in generate-article chat-edit manage-settings; do
  aws lambda update-function-code \
    --function-name blog-agent-$func-production \
    --zip-file fileb://deployment.zip \
    --publish
done
```

---

## 📊 モニタリング

### CloudWatchアラーム

| アラーム | 閾値 | 説明 |
|---------|------|------|
| API Gateway 5xx | > 10/5分 | サーバーエラー検知 |
| API Gateway Latency | > 5000ms | レイテンシー異常 |
| Lambda Errors | > 5/5分 | Lambda実行エラー |
| Lambda Throttles | > 1/5分 | スロットリング検知 |
| DynamoDB Read Throttle | > 1/5分 | 読み取りスロットリング |
| DynamoDB Write Throttle | > 1/5分 | 書き込みスロットリング |

### CloudWatchダッシュボード

ダッシュボードURL:
```
https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=blog-agent-production
```

表示メトリクス:
- API Gatewayリクエスト数・エラー率
- API Gatewayレイテンシー（平均・p99）
- Lambda実行数・エラー数・スロットル
- Lambdaデュレーション（平均・p99）
- DynamoDB消費キャパシティ
- CloudFrontリクエスト数・エラー率

### アラート通知

SNS経由でメール通知:
1. monitoring.yamlの`AlertEmail`パラメータにメールアドレスを設定
2. スタックデプロイ後、確認メールが届くので承認

---

## 💾 バックアップ

### AWS Backupの設定

| プラン | スケジュール | 保持期間 |
|--------|-------------|---------|
| 日次バックアップ | 毎日 12:00 JST | 30日間 |
| 週次バックアップ | 毎週日曜 12:00 JST | 90日間 |

### バックアップ対象
- DynamoDBテーブル（blog-agent-*-production）

### リストア手順
```bash
# バックアップ一覧
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name blog-agent-vault-production

# リストアジョブの開始
aws backup start-restore-job \
  --recovery-point-arn arn:aws:backup:... \
  --metadata TargetTableName=blog-agent-articles-restored \
  --iam-role-arn arn:aws:iam::...:role/blog-agent-backup-role-production
```

---

## 🧪 デプロイ後の確認

### ヘルスチェック

**フロントエンド**
```bash
# CloudFront URL
curl -I https://xxxxx.cloudfront.net

# 期待レスポンス: HTTP/2 200
```

**API Gateway**
```bash
# API Endpoint
curl https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/production/health

# 期待レスポンス: {"status": "healthy"}
```

### スモークテスト

```bash
# ログイン（トークン取得）
TOKEN=$(aws cognito-idp initiate-auth \
  --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=$USER,PASSWORD=$PASS \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# 設定取得テスト
curl -X GET https://api.example.com/production/settings \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 トラブルシューティング

### よくある問題

**1. CloudFrontがキャッシュを返し続ける**
```bash
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

**2. Lambdaのタイムアウト**
```bash
aws lambda update-function-configuration \
  --function-name blog-agent-generate-article-production \
  --timeout 90
```

**3. DynamoDBのスロットリング**
- CloudWatchでスロットリング状況を確認
- PAY_PER_REQUEST（オンデマンド）モードを確認

**4. CloudFormationスタックの更新失敗**
```bash
# ロールバック
aws cloudformation cancel-update-stack \
  --stack-name blog-agent-production

# スタック状態の確認
aws cloudformation describe-stacks \
  --stack-name blog-agent-production \
  --query 'Stacks[0].StackStatus'
```

---

## 📚 ロールバック手順

### フロントエンドのロールバック

**S3バージョニングから復元**
```bash
# バージョン一覧
aws s3api list-object-versions \
  --bucket $BUCKET_NAME \
  --prefix index.html

# 特定バージョンに復元
aws s3api copy-object \
  --bucket $BUCKET_NAME \
  --copy-source $BUCKET_NAME/index.html?versionId=VERSION_ID \
  --key index.html
```

### バックエンドのロールバック

**Lambda関数のバージョン切り替え**
```bash
# バージョン一覧
aws lambda list-versions-by-function \
  --function-name blog-agent-generate-article-production

# エイリアスの更新（特定バージョンに切り替え）
aws lambda update-alias \
  --function-name blog-agent-generate-article-production \
  --name live \
  --function-version $VERSION
```

### CloudFormationのロールバック

```bash
aws cloudformation rollback-stack \
  --stack-name blog-agent-production
```

---

## 🔗 関連ドキュメント

- **02_architecture.md** - システム構成
- **09_testing_strategy.md** - デプロイ前テスト
- **10_change_log.md** - デプロイ履歴

---

**最終更新**: 2026-01-10
**レビュー者**: れんじろう
**次回レビュー**: リリース後
