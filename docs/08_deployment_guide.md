# デプロイガイド

**ドキュメントバージョン**: 1.0  
**最終更新日**: 2024-12-03  
**関連ドキュメント**: 02_architecture.md

---

## 🚀 デプロイ概要

このドキュメントでは、ブログ生成エージェントのデプロイ手順を説明します。

### デプロイ環境
- **開発環境（dev）**: 機能開発・テスト用
- **本番環境（prod）**: 実ユーザー向け

---

## 📋 前提条件

### 必要なツール
```bash
# AWS CLI
aws --version  # 2.0以上

# Node.js
node --version  # 20.x

# Python
python --version  # 3.11

# AWS SAM CLI
sam --version  # 1.100以上
```

### AWS認証情報設定
```bash
aws configure
# AWS Access Key ID: XXXXX
# AWS Secret Access Key: XXXXX
# Default region: ap-northeast-1
# Default output format: json
```

---

## 🏗️ 初回セットアップ

### 1. リポジトリクローン
```bash
git clone https://github.com/yourusername/blog-agent.git
cd blog-agent
```

### 2. 環境変数設定

**フロントエンド（.env.production）**
```bash
VITE_API_BASE_URL=https://api.blog-agent.com
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_XXXXX
VITE_COGNITO_CLIENT_ID=XXXXX
```

**バックエンド（samconfig.toml）**
```toml
version = 0.1
[default.deploy.parameters]
stack_name = "blog-agent-prod"
region = "ap-northeast-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = [
  "Environment=prod",
  "ClaudeAPIKey=XXXXX"
]
```

---

## 🎨 フロントエンドデプロイ

### 手順

**1. ビルド**
```bash
cd frontend
npm install
npm run build
```

**2. S3にアップロード**
```bash
aws s3 sync dist/ s3://blog-agent-frontend-prod \
  --delete \
  --cache-control "public, max-age=31536000"
```

**3. CloudFrontキャッシュクリア**
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### 自動化スクリプト

**deploy-frontend.sh**
```bash
#!/bin/bash

set -e

ENV=${1:-prod}
echo "Deploying frontend to $ENV..."

# ビルド
cd frontend
npm run build

# S3アップロード
if [ "$ENV" = "prod" ]; then
  BUCKET="blog-agent-frontend-prod"
  DIST_ID="E1234567890ABC"
else
  BUCKET="blog-agent-frontend-dev"
  DIST_ID="E0987654321XYZ"
fi

aws s3 sync dist/ s3://$BUCKET --delete

# キャッシュクリア
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"

echo "Frontend deployed successfully!"
```

**使用方法**
```bash
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh prod
```

---

## ⚙️ バックエンドデプロイ

### SAMを使用したデプロイ

**1. ビルド**
```bash
cd backend
sam build
```

**2. デプロイ（初回）**
```bash
sam deploy --guided
```

対話形式で以下を入力：
- Stack Name: blog-agent-prod
- AWS Region: ap-northeast-1
- Parameter Environment: prod
- Confirm changes before deploy: Y
- Allow SAM CLI IAM role creation: Y
- Save arguments to configuration file: Y

**3. デプロイ（2回目以降）**
```bash
sam deploy
```

### Lambda関数の個別更新

特定のLambda関数のみ更新する場合：

```bash
# 記事生成Lambda のみ更新
cd backend/functions/generate-article
zip -r function.zip .
aws lambda update-function-code \
  --function-name blog-agent-generate-article-prod \
  --zip-file fileb://function.zip
```

---

## 🗄️ データベースセットアップ

### DynamoDBテーブル作成

**AWS CLIで作成**
```bash
# ユーザーテーブル
aws dynamodb create-table \
  --table-name blog-agent-users-prod \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --point-in-time-recovery-specification Enabled=true

# 記事テーブル
aws dynamodb create-table \
  --table-name blog-agent-articles-prod \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=articleId,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=articleId,KeyType=RANGE \
  --global-secondary-indexes \
    'IndexName=CreatedAtIndex,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
  --billing-mode PAY_PER_REQUEST \
  --point-in-time-recovery-specification Enabled=true
```

### 初期データ投入

```bash
cd backend/scripts
python seed_data.py --env prod
```

---

## 🔐 Cognitoセットアップ

### User Pool作成

**AWS CLIで作成**
```bash
aws cognito-idp create-user-pool \
  --pool-name blog-agent-users-prod \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --email-configuration EmailSendingAccount=COGNITO_DEFAULT
```

### User Pool Client作成

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id ap-northeast-1_XXXXX \
  --client-name blog-agent-web-prod \
  --explicit-auth-flows \
    ALLOW_USER_PASSWORD_AUTH \
    ALLOW_REFRESH_TOKEN_AUTH \
  --token-validity-units '{
    "AccessToken": "hours",
    "IdToken": "hours",
    "RefreshToken": "days"
  }' \
  --access-token-validity 1 \
  --id-token-validity 1 \
  --refresh-token-validity 30
```

---

## 📊 モニタリング設定

### CloudWatch Alarms

**Lambda エラーアラーム**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name blog-agent-lambda-errors-prod \
  --alarm-description "Lambda error rate > 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=blog-agent-generate-article-prod \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:ap-northeast-1:123456789012:blog-agent-alerts
```

**API Gateway エラーアラーム**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name blog-agent-api-5xx-prod \
  --alarm-description "API 5XX error rate > 1%" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --dimensions Name=ApiName,Value=blog-agent-api-prod \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 0.01 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:ap-northeast-1:123456789012:blog-agent-alerts
```

---

## 🔄 CI/CDパイプライン

### GitHub Actions設定

**.github/workflows/deploy.yml**
```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build
        run: |
          cd frontend
          npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Deploy to S3
        run: |
          aws s3 sync frontend/dist/ s3://blog-agent-frontend-prod --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Setup SAM
        uses: aws-actions/setup-sam@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: SAM Build
        run: |
          cd backend
          sam build
      
      - name: SAM Deploy
        run: |
          cd backend
          sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
```

---

## 🧪 デプロイ後の確認

### ヘルスチェック

```bash
# フロントエンド
curl https://blog-agent.com

# バックエンドAPI
curl -X GET https://api.blog-agent.com/health \
  -H "Content-Type: application/json"

# 期待レスポンス
# {"status": "healthy", "version": "1.0.0"}
```

### スモークテスト

```bash
# 記事生成APIテスト
curl -X POST https://api.blog-agent.com/articles/generate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "テスト記事",
    "contentPoints": "テスト内容",
    "wordCount": 1000
  }'
```

---

## 🔧 トラブルシューティング

### よくある問題

**1. CloudFrontがキャッシュを返し続ける**
```bash
# 強制的にキャッシュクリア
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

**2. Lambdaのタイムアウト**
```bash
# タイムアウト時間を延長
aws lambda update-function-configuration \
  --function-name blog-agent-generate-article-prod \
  --timeout 90
```

**3. DynamoDBのスロットリング**
```bash
# オンデマンドモードに変更
aws dynamodb update-table \
  --table-name blog-agent-articles-prod \
  --billing-mode PAY_PER_REQUEST
```

---

## 📚 ロールバック手順

### フロントエンドのロールバック

```bash
# S3バージョニングから復元
aws s3api list-object-versions \
  --bucket blog-agent-frontend-prod \
  --prefix index.html

aws s3api copy-object \
  --bucket blog-agent-frontend-prod \
  --copy-source blog-agent-frontend-prod/index.html?versionId=VERSION_ID \
  --key index.html
```

### バックエンドのロールバック

```bash
# CloudFormationスタックのロールバック
aws cloudformation rollback-stack \
  --stack-name blog-agent-prod
```

---

## 🔗 関連ドキュメント

- **02_architecture.md** - システム構成
- **09_testing_strategy.md** - デプロイ前テスト
- **10_change_log.md** - デプロイ履歴

---

**最終更新**: 2024-12-03  
**レビュー者**: れんじろう  
**次回レビュー**: 初回デプロイ後
