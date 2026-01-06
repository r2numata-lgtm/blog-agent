"""
設定管理Lambda関数
ユーザーの記事スタイル設定、装飾プリセット、SEO設定を管理
"""

import os
import json
import time
from typing import Any
import boto3
from botocore.exceptions import ClientError


# 環境変数
USERS_TABLE = os.environ.get("USERS_TABLE", "blog-agent-users")
REGION = os.environ.get("AWS_REGION", "ap-northeast-1")

# DynamoDBクライアント
dynamodb = boto3.resource("dynamodb", region_name=REGION)
users_table = dynamodb.Table(USERS_TABLE)


def create_response(status_code: int, body: dict) -> dict:
    """APIレスポンスを作成"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def get_user_id_from_context(event: dict) -> str | None:
    """Lambda Authorizer contextからユーザーIDを取得"""
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})
    return authorizer.get("userId")


def get_settings(user_id: str) -> dict:
    """ユーザー設定を取得"""
    try:
        response = users_table.get_item(Key={"userId": user_id})
        item = response.get("Item")

        if not item:
            # ユーザーが存在しない場合は新規作成
            return {
                "articleStyle": None,
                "decorations": None,
                "seo": None,
                "sampleArticles": [],
            }

        return {
            "articleStyle": item.get("articleStyle"),
            "decorations": item.get("decorations"),
            "seo": item.get("seo"),
            "sampleArticles": item.get("sampleArticles", []),
        }
    except ClientError as e:
        raise Exception(f"DynamoDB error: {e.response['Error']['Message']}")


def save_settings(user_id: str, settings: dict) -> dict:
    """ユーザー設定を保存"""
    try:
        now = int(time.time())

        # UpdateExpressionを動的に構築
        update_parts = []
        expression_values = {":updatedAt": now}
        expression_names = {}

        # articleStyle
        if "articleStyle" in settings:
            update_parts.append("#articleStyle = :articleStyle")
            expression_values[":articleStyle"] = settings["articleStyle"]
            expression_names["#articleStyle"] = "articleStyle"

        # decorations
        if "decorations" in settings:
            update_parts.append("#decorations = :decorations")
            expression_values[":decorations"] = settings["decorations"]
            expression_names["#decorations"] = "decorations"

        # seo
        if "seo" in settings:
            update_parts.append("#seo = :seo")
            expression_values[":seo"] = settings["seo"]
            expression_names["#seo"] = "seo"

        # sampleArticles
        if "sampleArticles" in settings:
            update_parts.append("#sampleArticles = :sampleArticles")
            expression_values[":sampleArticles"] = settings["sampleArticles"]
            expression_names["#sampleArticles"] = "sampleArticles"

        update_parts.append("updatedAt = :updatedAt")

        update_expression = "SET " + ", ".join(update_parts)

        response = users_table.update_item(
            Key={"userId": user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names if expression_names else None,
            ReturnValues="ALL_NEW",
        )

        updated_item = response.get("Attributes", {})
        return {
            "articleStyle": updated_item.get("articleStyle"),
            "decorations": updated_item.get("decorations"),
            "seo": updated_item.get("seo"),
            "sampleArticles": updated_item.get("sampleArticles", []),
            "updatedAt": updated_item.get("updatedAt"),
        }
    except ClientError as e:
        raise Exception(f"DynamoDB error: {e.response['Error']['Message']}")


def handler(event: dict[str, Any], context: Any) -> dict:
    """
    Lambda ハンドラー

    GET /settings - 設定を取得
    PUT /settings - 設定を保存
    """
    try:
        # ユーザーID取得
        user_id = get_user_id_from_context(event)
        if not user_id:
            return create_response(401, {
                "success": False,
                "error": {"code": "AUTH_001", "message": "認証が必要です"}
            })

        http_method = event.get("httpMethod", "GET")

        # GET: 設定取得
        if http_method == "GET":
            settings = get_settings(user_id)
            return create_response(200, {
                "success": True,
                "data": settings
            })

        # PUT: 設定保存
        if http_method == "PUT":
            body = json.loads(event.get("body", "{}"))
            settings = save_settings(user_id, body)
            return create_response(200, {
                "success": True,
                "data": settings,
                "message": "設定を保存しました"
            })

        # OPTIONS: CORS preflight
        if http_method == "OPTIONS":
            return create_response(200, {})

        return create_response(405, {
            "success": False,
            "error": {"code": "METHOD_NOT_ALLOWED", "message": "許可されていないメソッドです"}
        })

    except json.JSONDecodeError:
        return create_response(400, {
            "success": False,
            "error": {"code": "VALIDATION_001", "message": "無効なJSONデータです"}
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return create_response(500, {
            "success": False,
            "error": {"code": "SERVER_001", "message": "サーバーエラーが発生しました"}
        })
