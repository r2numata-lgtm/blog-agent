"""
ローカル開発用APIサーバー
FastAPIでLambda関数をローカル実行可能にする
"""

import os
import sys
import json
import importlib.util
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

# バックエンドディレクトリ
backend_dir = Path(__file__).parent

# 環境変数読み込み
load_dotenv(backend_dir / ".env")

# Claude API キーを環境変数にセット（Lambda関数が参照する名前）
os.environ['CLAUDE_API_KEY'] = os.environ.get('ANTHROPIC_API_KEY', '')

# ローカル開発用: DynamoDBをモック
os.environ['LOCAL_DEV'] = 'true'


def load_lambda_module(function_name: str, module_file: str = "app.py"):
    """Lambda関数モジュールを分離してロード"""
    function_dir = backend_dir / "functions" / function_name
    module_path = function_dir / module_file

    # 他のLambda関数のパスを一時的に除外
    functions_dir = str(backend_dir / "functions")
    original_path = sys.path.copy()

    # Lambda関数間で共有されるモジュール名をキャッシュから削除
    modules_to_remove = ['validators', 'utils', 'prompt_builder', 'diff_utils', 'handler', 'app']
    removed_modules = {}
    for mod_name in modules_to_remove:
        if mod_name in sys.modules:
            removed_modules[mod_name] = sys.modules.pop(mod_name)

    # 他のLambda関数ディレクトリを除外し、現在の関数ディレクトリを先頭に追加
    sys.path = [str(function_dir)] + [
        p for p in original_path
        if not (p.startswith(functions_dir) and p != str(function_dir))
    ]

    try:
        spec = importlib.util.spec_from_file_location(
            f"{function_name}_{module_file.replace('.py', '')}",
            module_path
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        # sys.pathを復元
        sys.path = original_path


# Lambda関数モジュールをロード
print("Loading Lambda modules...")

generate_article_module = load_lambda_module("generate-article", "app.py")
print("  ✓ generate-article")

chat_edit_module = load_lambda_module("chat-edit", "app.py")
print("  ✓ chat-edit")

settings_module = load_lambda_module("manage-settings", "handler.py")
print("  ✓ manage-settings")


app = FastAPI(
    title="Blog Agent API",
    description="ローカル開発用APIサーバー",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_lambda_event(request: Request, body: dict, authorization: Optional[str] = None) -> dict:
    """FastAPIリクエストをLambdaイベント形式に変換"""
    # 認証ヘッダーからユーザーIDを抽出（開発用にダミー）
    user_id = "dev-user-001"
    if authorization and authorization.startswith("Bearer "):
        # 本来はJWTをデコードするが、開発用にダミー
        user_id = "dev-user-001"

    return {
        "httpMethod": request.method,
        "path": str(request.url.path),
        "resource": str(request.url.path),
        "headers": dict(request.headers),
        "body": json.dumps(body) if body else None,
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": user_id,
                    "email": "dev@example.com"
                }
            }
        }
    }


def parse_lambda_response(response: dict) -> dict:
    """Lambdaレスポンスをパース"""
    status_code = response.get("statusCode", 500)
    body = response.get("body", "{}")

    if isinstance(body, str):
        body = json.loads(body)

    if status_code >= 400:
        print(f"[ERROR] Status: {status_code}, Body: {body}")
        raise HTTPException(status_code=status_code, detail=body)

    return body


# ヘルスチェック
@app.get("/health")
async def health_check():
    api_key = os.environ.get('CLAUDE_API_KEY', '')
    return {
        "status": "ok",
        "claude_api_configured": bool(api_key and api_key != "your_anthropic_api_key_here")
    }


# 記事生成エンドポイント
@app.post("/articles/generate")
async def generate_article(request: Request, authorization: Optional[str] = Header(None)):
    """記事生成"""
    body = await request.json()
    event = create_lambda_event(request, body, authorization)
    response = generate_article_module.generate_article(event, None)
    return parse_lambda_response(response)


@app.post("/articles/generate/titles")
async def generate_titles(request: Request, authorization: Optional[str] = Header(None)):
    """タイトル案生成"""
    body = await request.json()
    event = create_lambda_event(request, body, authorization)
    event["path"] = "/articles/generate/titles"
    response = generate_article_module.generate_titles(event, None)
    return parse_lambda_response(response)


@app.post("/articles/generate/meta")
async def generate_meta(request: Request, authorization: Optional[str] = Header(None)):
    """メタ情報生成"""
    body = await request.json()
    event = create_lambda_event(request, body, authorization)
    event["path"] = "/articles/generate/meta"
    response = generate_article_module.generate_meta(event, None)
    return parse_lambda_response(response)


# チャット編集エンドポイント
@app.post("/chat/edit")
async def chat_edit(request: Request, authorization: Optional[str] = Header(None)):
    """チャットによる記事編集"""
    body = await request.json()
    event = create_lambda_event(request, body, authorization)
    response = chat_edit_module.edit_article(event, None)
    return parse_lambda_response(response)


# 設定エンドポイント
@app.get("/settings")
async def get_settings(request: Request, authorization: Optional[str] = Header(None)):
    """設定取得"""
    event = create_lambda_event(request, {}, authorization)
    response = settings_module.get_settings(event, None)
    return parse_lambda_response(response)


@app.put("/settings")
async def save_settings(request: Request, authorization: Optional[str] = Header(None)):
    """設定保存"""
    body = await request.json()
    event = create_lambda_event(request, body, authorization)
    response = settings_module.save_settings(event, None)
    return parse_lambda_response(response)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Blog Agent ローカル開発サーバー")
    print("="*60)

    api_key = os.environ.get('CLAUDE_API_KEY', '')
    if not api_key or api_key == "your_anthropic_api_key_here":
        print("\n⚠️  警告: ANTHROPIC_API_KEY が設定されていません")
        print("   backend/.env ファイルを編集してAPIキーを設定してください")
        print("   例: ANTHROPIC_API_KEY=sk-ant-...")
    else:
        print("\n✅ Claude API キーが設定されています")

    print("\n📡 サーバー起動中...")
    print("   URL: http://localhost:3000")
    print("   ドキュメント: http://localhost:3000/docs")
    print("="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=3000)
