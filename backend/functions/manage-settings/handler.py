"""
設定管理Lambda関数
ユーザーの記事スタイル設定、装飾プリセット、SEO設定を管理
"""

import os
import json
import time
from decimal import Decimal
from typing import Any
import boto3
from botocore.exceptions import ClientError


def decimal_default(obj):
    """JSON encoder for Decimal types"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


# 環境変数
# DYNAMODB_TABLE_SETTINGS または USERS_TABLE（後方互換）
USERS_TABLE = os.environ.get("DYNAMODB_TABLE_SETTINGS") or os.environ.get("USERS_TABLE", "blog-agent-settings")
REGION = os.environ.get("AWS_REGION", "ap-northeast-1")

# 有効なRole/Schema定義
VALID_ROLES = {"attention", "warning", "summarize", "explain", "action"}
VALID_SCHEMAS = {"paragraph", "box", "list", "steps", "table", "callout"}

# Role × Schema 制限マップ
ROLE_SCHEMA_CONSTRAINTS = {
    "attention": {"paragraph", "box"},
    "warning": {"paragraph", "box"},
    "summarize": {"paragraph", "box", "list"},
    "explain": {"paragraph", "box", "table"},
    "action": {"callout"},
}

# デフォルト設定（decorationService.ts / settingsStore.ts と同期）
# 新スキーマ: roles + schema + options + class
DEFAULT_SETTINGS = {
    "articleStyle": {
        "taste": "friendly",
        "firstPerson": "watashi",
        "readerAddress": "minasan",
        "tone": "explanatory",
        "introStyle": "problem"
    },
    "decorations": [
        # attention + paragraph: インラインハイライト
        {
            "id": "ba-highlight",
            "label": "ハイライト",
            "roles": ["attention"],
            "schema": "paragraph",
            "options": {},
            "class": "ba-highlight",
            "css": ".ba-highlight { background: linear-gradient(transparent 60%, #fff59d 60%); padding: 0 4px; font-weight: 600; display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone; }",
            "enabled": True
        },
        # attention + box: ポイントボックス
        {
            "id": "ba-point",
            "label": "ポイント",
            "roles": ["attention"],
            "schema": "box",
            "options": {"title": {"required": True, "source": "claude"}},
            "class": "ba-point",
            "css": ".ba-point { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-point .box-title { font-weight: 700; color: #1976d2; margin-bottom: 8px; font-size: 14px; }",
            "enabled": True
        },
        # warning + box: 警告ボックス
        {
            "id": "ba-warning",
            "label": "警告",
            "roles": ["warning"],
            "schema": "box",
            "options": {"title": {"required": True, "source": "claude"}},
            "class": "ba-warning",
            "css": ".ba-warning { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-warning .box-title { font-weight: 700; color: #e65100; margin-bottom: 8px; font-size: 14px; }",
            "enabled": True
        },
        # explain + box: 補足説明ボックス
        {
            "id": "ba-explain",
            "label": "補足説明",
            "roles": ["explain"],
            "schema": "box",
            "options": {"title": {"required": False, "source": "claude"}},
            "class": "ba-explain",
            "css": ".ba-explain { background-color: #f5f5f5; border-left: 4px solid #9e9e9e; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; } .ba-explain .box-title { font-weight: 700; color: #616161; margin-bottom: 8px; font-size: 14px; }",
            "enabled": True
        },
        # summarize + box: まとめボックス
        {
            "id": "ba-summary-box",
            "label": "まとめボックス",
            "roles": ["summarize"],
            "schema": "box",
            "options": {"title": {"required": True, "source": "claude"}},
            "class": "ba-summary-box",
            "css": ".ba-summary-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 24px; margin: 24px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); } .ba-summary-box .box-title { font-weight: 700; margin-bottom: 12px; font-size: 16px; }",
            "enabled": True
        },
        # summarize + list: まとめリスト
        {
            "id": "ba-summary-list",
            "label": "まとめリスト",
            "roles": ["summarize"],
            "schema": "list",
            "options": {"ordered": False},
            "class": "ba-summary-list",
            "css": ".ba-summary-list { background-color: #fafafa; padding: 16px 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e0e0e0; } .ba-summary-list .box-title { font-weight: 700; color: #333; margin-bottom: 8px; font-size: 14px; } .ba-summary-list ul { margin: 0; padding-left: 20px; } .ba-summary-list li { margin-bottom: 4px; }",
            "enabled": True
        },
        # explain + table: 比較テーブル
        {
            "id": "ba-table",
            "label": "比較テーブル",
            "roles": ["explain"],
            "schema": "table",
            "options": {"headers": {"required": True, "source": "claude"}},
            "class": "ba-table",
            "css": ".ba-table { margin: 24px 0; overflow-x: auto; } .ba-table table { width: 100%; border-collapse: collapse; } .ba-table th, .ba-table td { border: 1px solid #e0e0e0; padding: 12px; text-align: left; } .ba-table th { background-color: #f5f5f5; font-weight: 700; }",
            "enabled": True
        },
        # action + callout: CTAボタン
        {
            "id": "ba-callout",
            "label": "アクションボタン",
            "roles": ["action"],
            "schema": "callout",
            "options": {"buttonText": {"source": "claude"}},
            "class": "ba-callout",
            "css": ".ba-callout { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px 24px; margin: 24px 0; border-radius: 0 8px 8px 0; text-align: center; } .ba-callout p { margin-bottom: 16px; font-size: 16px; } .ba-callout .callout-button { background-color: #4caf50; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; } .ba-callout .callout-button:hover { background-color: #43a047; }",
            "enabled": True
        },
    ],
    "baseClass": "ba-article",
    "seo": {
        "metaDescriptionLength": 140,
        "maxKeywords": 7
    },
    "sampleArticles": []
}


def validate_decoration(decoration: dict) -> str | None:
    """単一の装飾設定をバリデーション"""
    # 必須フィールドチェック
    required_fields = ["id", "label", "roles", "schema", "options", "class", "css", "enabled"]
    for field in required_fields:
        if field not in decoration:
            return f"装飾設定に {field} が必要です"

    # IDフォーマット
    if not decoration["id"].startswith("ba-"):
        return "IDは ba- で始まる必要があります"

    # Rolesチェック
    roles = decoration.get("roles", [])
    if not roles or len(roles) == 0:
        return "少なくとも1つの役割が必要です"
    for role in roles:
        if role not in VALID_ROLES:
            return f"無効な役割: {role}"

    # Schemaチェック
    schema = decoration.get("schema")
    if schema not in VALID_SCHEMAS:
        return f"無効な構造タイプ: {schema}"

    # Role × Schema 制約チェック
    for role in roles:
        if schema not in ROLE_SCHEMA_CONSTRAINTS.get(role, set()):
            return f'役割 "{role}" は構造タイプ "{schema}" と組み合わせられません'

    return None


def validate_decorations(decorations: list) -> str | None:
    """装飾設定リスト全体をバリデーション"""
    if not isinstance(decorations, list):
        return "装飾設定はリスト形式である必要があります"

    ids = set()
    for dec in decorations:
        # 新スキーマかどうかチェック（schemaフィールドがあるか）
        if "schema" not in dec:
            # 旧スキーマは許容（マイグレーション対象）
            continue

        # 新スキーマの場合はバリデーション
        error = validate_decoration(dec)
        if error:
            return error

        # ID重複チェック
        if dec["id"] in ids:
            return f'装飾ID "{dec["id"]}" が重複しています'
        ids.add(dec["id"])

    return None

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
        "body": json.dumps(body, ensure_ascii=False, default=decimal_default),
    }


def get_user_id_from_context(event: dict) -> str | None:
    """Lambda Authorizer contextからユーザーIDを取得"""
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})

    # HTTP API v2では authorizer.lambda 配下にコンテキストがある
    if "lambda" in authorizer:
        authorizer = authorizer.get("lambda", {})
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

        # HTTP API v2 と REST API v1 両方に対応
        http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")

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
