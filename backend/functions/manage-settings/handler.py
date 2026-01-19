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

# デフォルト設定（decorationService.ts / settingsStore.ts と同期）
DEFAULT_SETTINGS = {
    "articleStyle": {
        "taste": "friendly",
        "firstPerson": "watashi",
        "readerAddress": "minasan",
        "tone": "explanatory",
        "introStyle": "problem"
    },
    "decorations": [
        {
            "id": "ba-highlight",
            "label": "ハイライト",
            "roles": ["attention"],
            "css": ".ba-highlight { background: linear-gradient(transparent 60%, #fff59d 60%); padding: 0 4px; font-weight: 600; }",
            "enabled": True
        },
        {
            "id": "ba-point",
            "label": "ポイント",
            "roles": ["attention", "explain"],
            "css": ".ba-point { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-point::before { content: \"💡 ポイント\"; display: block; font-weight: 700; color: #1976d2; margin-bottom: 8px; font-size: 14px; }",
            "enabled": True
        },
        {
            "id": "ba-warning",
            "label": "警告",
            "roles": ["warning"],
            "css": ".ba-warning { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-warning::before { content: \"⚠️ 注意\"; display: block; font-weight: 700; color: #e65100; margin-bottom: 8px; font-size: 14px; }",
            "enabled": True
        },
        {
            "id": "ba-success",
            "label": "成功",
            "roles": ["action"],
            "css": ".ba-success { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-success::before { content: \"✅ 成功\"; display: block; font-weight: 700; color: #2e7d32; margin-bottom: 8px; font-size: 14px; }",
            "enabled": True
        },
        {
            "id": "ba-quote",
            "label": "引用",
            "roles": ["explain"],
            "css": ".ba-quote { background-color: #f5f5f5; border-left: 4px solid #9e9e9e; padding: 16px 20px; margin: 24px 0; font-style: italic; color: #616161; border-radius: 0 8px 8px 0; } .ba-quote::before { content: \"📝\"; margin-right: 8px; }",
            "enabled": True
        },
        {
            "id": "ba-summary",
            "label": "まとめ",
            "roles": ["summarize"],
            "css": ".ba-summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 24px; margin: 24px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); } .ba-summary::before { content: \"📋 まとめ\"; display: block; font-weight: 700; margin-bottom: 12px; font-size: 16px; }",
            "enabled": True
        },
        {
            "id": "ba-checklist",
            "label": "チェックリスト",
            "roles": ["summarize", "action"],
            "css": ".ba-checklist { background-color: #fafafa; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; } .ba-checklist ul { list-style: none; padding: 0; margin: 0; } .ba-checklist li { padding: 8px 0; padding-left: 28px; position: relative; } .ba-checklist li::before { content: \"☑️\"; position: absolute; left: 0; }",
            "enabled": True
        },
        {
            "id": "ba-number-list",
            "label": "番号付きリスト",
            "roles": ["explain", "action"],
            "css": ".ba-number-list { background-color: #fff; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; counter-reset: number-list; } .ba-number-list ol { list-style: none; padding: 0; margin: 0; } .ba-number-list li { padding: 12px 0; padding-left: 40px; position: relative; border-bottom: 1px dashed #e0e0e0; counter-increment: number-list; } .ba-number-list li:last-child { border-bottom: none; } .ba-number-list li::before { content: counter(number-list); position: absolute; left: 0; width: 28px; height: 28px; background: #2196f3; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }",
            "enabled": True
        }
    ],
    "baseClass": "ba-article",
    "seo": {
        "metaDescriptionLength": 140,
        "maxKeywords": 7
    },
    "sampleArticles": []
}

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
    """ユーザー設定を取得（未設定項目はデフォルト値を返す）"""
    try:
        response = users_table.get_item(Key={"userId": user_id})
        item = response.get("Item")

        if not item:
            # ユーザーが存在しない場合はデフォルト設定を返す
            return DEFAULT_SETTINGS.copy()

        # 各項目について、設定がなければデフォルト値を使用
        return {
            "articleStyle": item.get("articleStyle") or DEFAULT_SETTINGS["articleStyle"],
            "decorations": item.get("decorations") or DEFAULT_SETTINGS["decorations"],
            "seo": item.get("seo") or DEFAULT_SETTINGS["seo"],
            "baseClass": item.get("baseClass") or DEFAULT_SETTINGS["baseClass"],
            "sampleArticles": item.get("sampleArticles") if item.get("sampleArticles") is not None else DEFAULT_SETTINGS["sampleArticles"],
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

        # baseClass
        if "baseClass" in settings:
            update_parts.append("#baseClass = :baseClass")
            expression_values[":baseClass"] = settings["baseClass"]
            expression_names["#baseClass"] = "baseClass"

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
            "articleStyle": updated_item.get("articleStyle") or DEFAULT_SETTINGS["articleStyle"],
            "decorations": updated_item.get("decorations") or DEFAULT_SETTINGS["decorations"],
            "seo": updated_item.get("seo") or DEFAULT_SETTINGS["seo"],
            "baseClass": updated_item.get("baseClass") or DEFAULT_SETTINGS["baseClass"],
            "sampleArticles": updated_item.get("sampleArticles") if updated_item.get("sampleArticles") is not None else DEFAULT_SETTINGS["sampleArticles"],
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
