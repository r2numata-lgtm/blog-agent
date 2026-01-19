# 本番デプロイチェックリスト

## 事前準備

### AWS設定
- [ ] AWS CLIがインストールされている（v2.0以上）
- [ ] AWS認証情報が設定されている（`aws configure`）
- [ ] 適切なIAM権限がある（CloudFormation, S3, CloudFront, Lambda, DynamoDB, IAM）

### GitHub設定
- [ ] リポジトリのSecretsに`AWS_ACCESS_KEY_ID`を設定
- [ ] リポジトリのSecretsに`AWS_SECRET_ACCESS_KEY`を設定
- [ ] リポジトリのVariablesに`VITE_API_URL`を設定
- [ ] リポジトリのVariablesに`VITE_COGNITO_USER_POOL_ID`を設定
- [ ] リポジトリのVariablesに`VITE_COGNITO_CLIENT_ID`を設定

### コード確認
- [ ] すべてのテストが通過している
- [ ] ビルドエラーがない
- [ ] 環境変数ファイルが正しく設定されている

---

## デプロイ手順

### 1. CloudFormationスタックのデプロイ

```bash
# メインスタック
aws cloudformation deploy \
  --template-file infra/cloudformation.yaml \
  --stack-name blog-agent-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

# モニタリングスタック（オプション）
aws cloudformation deploy \
  --template-file infra/monitoring.yaml \
  --stack-name blog-agent-monitoring-production \
  --parameter-overrides Environment=production AlertEmail=your-email@example.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset
```

### 2. スタック出力の確認

```bash
aws cloudformation describe-stacks \
  --stack-name blog-agent-production \
  --query 'Stacks[0].Outputs' \
  --output table
```

出力される情報：
- CloudFrontDistributionDomainName（フロントエンドURL）
- ApiGatewayEndpoint（API URL）
- FrontendBucketName（S3バケット名）

### 3. フロントエンドのビルドとデプロイ

```bash
cd frontend

# 環境変数を設定してビルド
VITE_API_URL=https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/production \
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx \
VITE_COGNITO_CLIENT_ID=xxxxx \
npm run build

# S3にデプロイ
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name blog-agent-production \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.json"

aws s3 cp dist/index.html s3://$BUCKET_NAME/ \
  --cache-control "public, max-age=0, must-revalidate"

# CloudFrontキャッシュ無効化
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name blog-agent-production \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

### 4. バックエンドのデプロイ

```bash
cd backend

# パッケージ作成
pip install -r requirements.txt -t lambda_package/
cp -r lambda/* lambda_package/
cd lambda_package && zip -r ../deployment.zip . && cd ..

# Lambda関数の更新
for func in generate-article chat-edit manage-settings; do
  aws lambda update-function-code \
    --function-name blog-agent-$func-production \
    --zip-file fileb://deployment.zip \
    --publish
done
```

---

## デプロイ後の確認

### ヘルスチェック
- [ ] フロントエンドにアクセスできる
- [ ] ログイン画面が表示される
- [ ] API Gatewayが応答する

### 機能確認
- [ ] ユーザー登録ができる
- [ ] ログインができる
- [ ] 設定の保存・読み込みができる
- [ ] 記事生成ができる
- [ ] エディタが動作する
- [ ] エクスポートができる

### モニタリング確認
- [ ] CloudWatchダッシュボードにアクセスできる
- [ ] アラームが正常に設定されている
- [ ] SNS通知が届く（テスト送信）

---

## ロールバック手順

問題が発生した場合：

```bash
# CloudFormationのロールバック
aws cloudformation rollback-stack --stack-name blog-agent-production

# または前バージョンのLambdaに切り替え
aws lambda update-alias \
  --function-name blog-agent-generate-article-production \
  --name live \
  --function-version PREVIOUS_VERSION
```

---

## 完了確認

- [ ] すべてのヘルスチェックが通過
- [ ] すべての機能確認が通過
- [ ] モニタリングが正常動作
- [ ] ドキュメントを更新（デプロイ日時を記録）
