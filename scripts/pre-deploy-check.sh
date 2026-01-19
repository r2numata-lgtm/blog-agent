#!/bin/bash
# Blog Agent 本番デプロイ前チェックスクリプト

set -e

echo "========================================"
echo "Blog Agent - Pre-Deployment Check"
echo "========================================"
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN++))
}

echo "1. AWS CLI チェック"
echo "-------------------"

if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version 2>&1 | cut -d/ -f2 | cut -d' ' -f1)
    check_pass "AWS CLI インストール済み (v$AWS_VERSION)"
else
    check_fail "AWS CLI がインストールされていません"
fi

if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    check_pass "AWS認証情報が設定されています (Account: $ACCOUNT_ID)"
else
    check_fail "AWS認証情報が設定されていません"
fi

echo ""
echo "2. Node.js チェック"
echo "-------------------"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js インストール済み ($NODE_VERSION)"
else
    check_fail "Node.js がインストールされていません"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm インストール済み (v$NPM_VERSION)"
else
    check_fail "npm がインストールされていません"
fi

echo ""
echo "3. フロントエンドチェック"
echo "-------------------------"

FRONTEND_DIR="$(dirname "$0")/../frontend"
if [ -d "$FRONTEND_DIR" ]; then
    check_pass "frontend ディレクトリが存在します"

    if [ -f "$FRONTEND_DIR/package.json" ]; then
        check_pass "package.json が存在します"
    else
        check_fail "package.json が見つかりません"
    fi

    if [ -d "$FRONTEND_DIR/node_modules" ]; then
        check_pass "node_modules が存在します"
    else
        check_warn "node_modules がありません（npm install が必要）"
    fi
else
    check_fail "frontend ディレクトリが見つかりません"
fi

echo ""
echo "4. バックエンドチェック"
echo "-----------------------"

BACKEND_DIR="$(dirname "$0")/../backend"
if [ -d "$BACKEND_DIR" ]; then
    check_pass "backend ディレクトリが存在します"

    if [ -f "$BACKEND_DIR/requirements.txt" ]; then
        check_pass "requirements.txt が存在します"
    else
        check_fail "requirements.txt が見つかりません"
    fi

    if [ -d "$BACKEND_DIR/lambda" ]; then
        check_pass "lambda ディレクトリが存在します"
    else
        check_fail "lambda ディレクトリが見つかりません"
    fi
else
    check_fail "backend ディレクトリが見つかりません"
fi

echo ""
echo "5. インフラファイルチェック"
echo "---------------------------"

INFRA_DIR="$(dirname "$0")/../infra"
if [ -f "$INFRA_DIR/cloudformation.yaml" ]; then
    check_pass "cloudformation.yaml が存在します"
else
    check_fail "cloudformation.yaml が見つかりません"
fi

if [ -f "$INFRA_DIR/monitoring.yaml" ]; then
    check_pass "monitoring.yaml が存在します"
else
    check_warn "monitoring.yaml が見つかりません（オプション）"
fi

echo ""
echo "6. GitHub Actions チェック"
echo "--------------------------"

WORKFLOWS_DIR="$(dirname "$0")/../.github/workflows"
if [ -f "$WORKFLOWS_DIR/ci.yml" ]; then
    check_pass "ci.yml が存在します"
else
    check_fail "ci.yml が見つかりません"
fi

if [ -f "$WORKFLOWS_DIR/deploy.yml" ]; then
    check_pass "deploy.yml が存在します"
else
    check_fail "deploy.yml が見つかりません"
fi

echo ""
echo "========================================"
echo "チェック結果サマリー"
echo "========================================"
echo -e "${GREEN}PASS: $PASS${NC}"
echo -e "${YELLOW}WARN: $WARN${NC}"
echo -e "${RED}FAIL: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}デプロイ準備が完了しています！${NC}"
    exit 0
else
    echo -e "${RED}デプロイ前に上記の問題を解決してください。${NC}"
    exit 1
fi
