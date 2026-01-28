#!/bin/bash
# Blog Agent デプロイスクリプト
# Usage: ./deploy.sh [dev|prod] [--skip-frontend] [--skip-backend]

set -e

# 引数解析
ENV=${1:-dev}
SKIP_FRONTEND=false
SKIP_BACKEND=false

for arg in "$@"; do
  case $arg in
    --skip-frontend)
      SKIP_FRONTEND=true
      ;;
    --skip-backend)
      SKIP_BACKEND=true
      ;;
  esac
done

# 環境変数
AWS_REGION=${AWS_REGION:-ap-northeast-1}
STACK_NAME="blog-agent-$ENV"

echo "========================================"
echo "Blog Agent - Deployment Script"
echo "Environment: $ENV"
echo "Region: $AWS_REGION"
echo "Skip Frontend: $SKIP_FRONTEND"
echo "Skip Backend: $SKIP_BACKEND"
echo "========================================"
echo ""

# ルートディレクトリに移動
cd "$(dirname "$0")/.."
ROOT_DIR=$(pwd)

# Claude API Keyの確認（CLAUDE_API_KEY または ANTHROPIC_API_KEY）
if [ -z "$CLAUDE_API_KEY" ]; then
  if [ -f "backend/.env" ]; then
    # CLAUDE_API_KEY または ANTHROPIC_API_KEY を探す
    export CLAUDE_API_KEY=$(grep -E "^(CLAUDE_API_KEY|ANTHROPIC_API_KEY)=" backend/.env | head -1 | cut -d '=' -f2)
  fi
fi

if [ -z "$CLAUDE_API_KEY" ]; then
  echo "Error: CLAUDE_API_KEY or ANTHROPIC_API_KEY is not set"
  echo "Please set it via environment variable or in backend/.env"
  exit 1
fi

echo "Claude API Key found: ${CLAUDE_API_KEY:0:20}..."

echo "Step 1: Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file infra/cloudformation.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Environment=$ENV \
    ClaudeApiKey=$CLAUDE_API_KEY \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  --region $AWS_REGION

echo "CloudFormation stack deployed successfully!"
echo ""

# スタック出力の取得
echo "Step 2: Getting stack outputs..."
get_output() {
  aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text \
    --region $AWS_REGION
}

BUCKET_NAME=$(get_output FrontendBucketName)
DISTRIBUTION_ID=$(get_output CloudFrontDistributionId)
CLOUDFRONT_DOMAIN=$(get_output CloudFrontDistributionDomainName)
API_ENDPOINT=$(get_output ApiGatewayEndpoint)
USER_POOL_ID=$(get_output UserPoolId)
USER_POOL_CLIENT_ID=$(get_output UserPoolClientId)

echo "Bucket: $BUCKET_NAME"
echo "Distribution ID: $DISTRIBUTION_ID"
echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo "API Endpoint: $API_ENDPOINT"
echo "User Pool ID: $USER_POOL_ID"
echo "User Pool Client ID: $USER_POOL_CLIENT_ID"
echo ""

# フロントエンド環境変数ファイルを生成
echo "Step 3: Generating frontend environment file..."
cat > frontend/.env.$ENV <<EOF
VITE_API_BASE_URL=$API_ENDPOINT
VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID
VITE_COGNITO_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_COGNITO_REGION=$AWS_REGION
EOF

echo "Generated frontend/.env.$ENV"
echo ""

# バックエンドのデプロイ
if [ "$SKIP_BACKEND" = false ]; then
  echo "Step 4: Deploying backend Lambda functions..."
  cd "$ROOT_DIR/backend"

  # Lambda関数をパッケージング
  for func_dir in functions/generate-article functions/chat-edit functions/manage-settings functions/authorizer; do
    if [ -d "$func_dir" ]; then
      func_name=$(basename $func_dir)
      echo "  Packaging $func_name..."

      # パッケージディレクトリを作成
      rm -rf /tmp/lambda_package_$func_name
      mkdir -p /tmp/lambda_package_$func_name

      # 依存関係をインストール（Lambda用にPython 3.11 Linuxバイナリ指定）
      if [ -f "$func_dir/requirements.txt" ]; then
        pip3 install -r "$func_dir/requirements.txt" -t /tmp/lambda_package_$func_name/ \
          --platform manylinux2014_x86_64 --implementation cp --python-version 3.11 --only-binary=:all: -q 2>/dev/null || \
        pip3 install -r "$func_dir/requirements.txt" -t /tmp/lambda_package_$func_name/ -q 2>/dev/null || true
      elif [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt -t /tmp/lambda_package_$func_name/ \
          --platform manylinux2014_x86_64 --implementation cp --python-version 3.11 --only-binary=:all: -q 2>/dev/null || \
        pip3 install -r requirements.txt -t /tmp/lambda_package_$func_name/ -q 2>/dev/null || true
      fi

      # ソースコードをコピー
      cp -r $func_dir/* /tmp/lambda_package_$func_name/

      # ZIPファイルを作成
      cd /tmp/lambda_package_$func_name
      zip -rq /tmp/$func_name.zip .
      cd "$ROOT_DIR/backend"

      # Lambda関数名を決定
      case $func_name in
        generate-article)
          LAMBDA_NAME="blog-agent-generate-article-$ENV"
          ;;
        chat-edit)
          LAMBDA_NAME="blog-agent-chat-edit-$ENV"
          ;;
        manage-settings)
          LAMBDA_NAME="blog-agent-manage-settings-$ENV"
          ;;
        authorizer)
          LAMBDA_NAME="blog-agent-authorizer-$ENV"
          ;;
      esac

      # Lambda関数を更新
      echo "  Updating $LAMBDA_NAME..."
      aws lambda update-function-code \
        --function-name $LAMBDA_NAME \
        --zip-file fileb:///tmp/$func_name.zip \
        --region $AWS_REGION \
        --output text --query 'FunctionArn' 2>/dev/null || echo "    Warning: Function $LAMBDA_NAME update failed"

      # クリーンアップ
      rm -rf /tmp/lambda_package_$func_name /tmp/$func_name.zip
    fi
  done

  echo "Backend deployment completed!"
  echo ""
fi

# フロントエンドのデプロイ
if [ "$SKIP_FRONTEND" = false ]; then
  echo "Step 5: Building and deploying frontend..."
  cd "$ROOT_DIR/frontend"

  # 環境変数ファイルをコピー
  cp .env.$ENV .env.local

  # ビルド
  npm ci
  npm run build

  # S3へデプロイ
  echo "  Uploading to S3..."

  # アセットファイル（長期キャッシュ）
  aws s3 sync dist/ s3://$BUCKET_NAME/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.json" \
    --region $AWS_REGION

  # index.html（キャッシュなし）
  aws s3 cp dist/index.html s3://$BUCKET_NAME/ \
    --cache-control "public, max-age=0, must-revalidate" \
    --region $AWS_REGION

  echo "  S3 deployment completed!"

  # CloudFrontキャッシュ無効化
  echo "  Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --region us-east-1 \
    --output text --query 'Invalidation.Id'

  echo "Frontend deployment completed!"
  echo ""
fi

# 完了
echo "========================================"
echo "Deployment completed successfully!"
echo "========================================"
echo ""
echo "Frontend URL: https://$CLOUDFRONT_DOMAIN"
echo "API URL: $API_ENDPOINT"
echo ""
echo "Cognito User Pool ID: $USER_POOL_ID"
echo "Cognito Client ID: $USER_POOL_CLIENT_ID"
echo ""
echo "Next steps:"
echo "1. Access the frontend URL to verify deployment"
echo "2. Create a test user in Cognito console"
echo "3. Test login and core features"
echo "4. Check CloudWatch for any errors"
