"""
AWS Lambda Authorizer for API Gateway HTTP API (v2)
Cognito JWTトークンを検証し、API Gatewayへのアクセスを制御する
"""

import os
import json
import time
import urllib.request
from typing import Any
from jose import jwt, JWTError


# 環境変数
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
COGNITO_REGION = os.environ.get("COGNITO_REGION", "ap-northeast-1")
COGNITO_APP_CLIENT_ID = os.environ.get("COGNITO_APP_CLIENT_ID")

# JWKS URLとキャッシュ
JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1時間


def get_jwks() -> dict:
    """JWKS（JSON Web Key Set）を取得（キャッシュ付き）"""
    global _jwks_cache, _jwks_cache_time

    current_time = time.time()
    if _jwks_cache and (current_time - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    with urllib.request.urlopen(JWKS_URL) as response:
        _jwks_cache = json.loads(response.read().decode("utf-8"))
        _jwks_cache_time = current_time
        return _jwks_cache


def get_public_key(token: str) -> dict | None:
    """トークンのkidに対応する公開鍵を取得"""
    try:
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")

        jwks = get_jwks()
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key
        return None
    except Exception:
        return None


def verify_token(token: str) -> dict | None:
    """JWTトークンを検証してペイロードを返す"""
    public_key = get_public_key(token)
    if not public_key:
        return None

    try:
        # トークンを検証
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=COGNITO_APP_CLIENT_ID,
            issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}",
            options={
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
            }
        )
        return claims
    except JWTError as e:
        print(f"JWT verification failed: {str(e)}")
        return None


def handler(event: dict[str, Any], context: Any) -> dict:
    """
    Lambda Authorizer ハンドラー (HTTP API v2 Simple Response Format)

    Args:
        event: API Gateway HTTP API v2からのイベント
        context: Lambda実行コンテキスト

    Returns:
        Simple response format: {"isAuthorized": bool, "context": dict}
    """
    print(f"Authorizer event: {json.dumps(event)}")

    try:
        # HTTP API v2 の場合、ヘッダーは identitySource から取得
        # または headers オブジェクトから直接取得
        auth_header = ""

        # identitySource から取得を試みる
        identity_source = event.get("identitySource", [])
        if identity_source and len(identity_source) > 0:
            auth_header = identity_source[0]

        # headers から取得を試みる（フォールバック）
        if not auth_header:
            headers = event.get("headers", {})
            auth_header = headers.get("authorization", "") or headers.get("Authorization", "")

        print(f"Auth header: {auth_header[:50] if auth_header else 'empty'}...")

        # Bearer トークンの抽出
        if not auth_header.startswith("Bearer "):
            print("No Bearer token found")
            return {"isAuthorized": False}

        token = auth_header[7:]  # "Bearer " を除去

        # トークンを検証
        claims = verify_token(token)
        if not claims:
            print("Token verification failed")
            return {"isAuthorized": False}

        # ユーザー情報をコンテキストに追加
        user_context = {
            "userId": claims.get("sub", ""),
            "email": claims.get("email", ""),
        }

        print(f"Authorization successful for user: {user_context['userId']}")

        return {
            "isAuthorized": True,
            "context": user_context,
        }

    except Exception as e:
        print(f"Authorizer error: {str(e)}")
        return {"isAuthorized": False}
