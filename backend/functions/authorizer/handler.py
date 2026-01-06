"""
AWS Lambda Authorizer for API Gateway
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
    except JWTError:
        return None


def generate_policy(principal_id: str, effect: str, resource: str, context: dict | None = None) -> dict:
    """API Gateway用のIAMポリシードキュメントを生成"""
    policy = {
        "principalId": principal_id,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": resource,
                }
            ],
        },
    }

    if context:
        policy["context"] = context

    return policy


def handler(event: dict[str, Any], context: Any) -> dict:
    """
    Lambda Authorizer ハンドラー

    Args:
        event: API Gatewayからのイベント
        context: Lambda実行コンテキスト

    Returns:
        IAMポリシードキュメント
    """
    try:
        # Authorizationヘッダーからトークンを取得
        auth_header = event.get("authorizationToken", "")
        method_arn = event.get("methodArn", "*")

        # Bearer トークンの抽出
        if not auth_header.startswith("Bearer "):
            return generate_policy("unauthorized", "Deny", method_arn)

        token = auth_header[7:]  # "Bearer " を除去

        # トークンを検証
        claims = verify_token(token)
        if not claims:
            return generate_policy("unauthorized", "Deny", method_arn)

        # ユーザー情報をコンテキストに追加
        user_context = {
            "userId": claims.get("sub", ""),
            "email": claims.get("email", ""),
            "tokenUse": claims.get("token_use", ""),
        }

        # 全てのリソースへのアクセスを許可（必要に応じて絞り込み可能）
        # methodArnの形式: arn:aws:execute-api:region:account-id:api-id/stage/method/resource-path
        # ワイルドカードで同一APIの全エンドポイントを許可
        arn_parts = method_arn.split(":")
        api_gateway_arn = ":".join(arn_parts[:5])
        api_id_stage = arn_parts[5].split("/")[:2]
        allowed_resource = f"{api_gateway_arn}:{'/'.join(api_id_stage)}/*"

        return generate_policy(
            principal_id=claims.get("sub", "user"),
            effect="Allow",
            resource=allowed_resource,
            context=user_context,
        )

    except Exception as e:
        print(f"Authorizer error: {str(e)}")
        return generate_policy("unauthorized", "Deny", event.get("methodArn", "*"))
