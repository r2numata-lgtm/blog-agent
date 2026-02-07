"""
サブスクリプション管理Lambda関数

エンドポイント:
  POST /api/stripe/create-checkout-session
  POST /api/stripe/create-portal-session
  POST /api/stripe/change-plan
  GET  /api/subscription/status
  GET  /api/subscription/usage
"""

import json
import os
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

import boto3
import stripe
from boto3.dynamodb.conditions import Key

from plan_rules import PLAN_RULES, get_effective_plan, get_plan_rules

# ロガー
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 環境変数
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_STARTER_PRICE_ID = os.environ.get("STRIPE_STARTER_PRICE_ID", "")
STRIPE_PRO_PRICE_ID = os.environ.get("STRIPE_PRO_PRICE_ID", "")
DYNAMODB_TABLE_USERS = os.environ.get("DYNAMODB_TABLE_SETTINGS", "blog-agent-settings")
DYNAMODB_TABLE_USAGE = os.environ.get("DYNAMODB_TABLE_USAGE", "myblog-ai-usage")

stripe.api_key = STRIPE_SECRET_KEY

# DynamoDB
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table(DYNAMODB_TABLE_USERS)
usage_table = dynamodb.Table(DYNAMODB_TABLE_USAGE)


# ============================================================
# ユーティリティ
# ============================================================

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def create_response(status_code: int, data: Optional[Dict] = None,
                    error_code: Optional[str] = None,
                    error_message: Optional[str] = None) -> Dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    }
    if error_code:
        body = {"success": False, "error": {"code": error_code, "message": error_message or "エラーが発生しました"}}
    else:
        body = {"success": True, "data": data}
    return {"statusCode": status_code, "headers": headers, "body": json.dumps(body, ensure_ascii=False, cls=DecimalEncoder)}


def parse_event_body(event: Dict) -> Optional[Dict]:
    body = event.get("body")
    if not body:
        return None
    try:
        return json.loads(body) if isinstance(body, str) else body
    except json.JSONDecodeError:
        return None


def get_user_id(event: Dict) -> Optional[str]:
    rc = event.get("requestContext", {})
    auth = rc.get("authorizer", {})
    lc = auth.get("lambda", {})
    return lc.get("userId") or auth.get("principalId") or auth.get("claims", {}).get("sub")


def get_user_email(event: Dict) -> str:
    """authorizerコンテキストからemailを取得"""
    rc = event.get("requestContext", {})
    auth = rc.get("authorizer", {})
    lc = auth.get("lambda", {})
    return lc.get("email", "") or auth.get("claims", {}).get("email", "")


def get_user(user_id: str) -> Optional[Dict]:
    """DynamoDBからユーザーを取得"""
    try:
        resp = users_table.get_item(Key={"userId": user_id})
        return resp.get("Item")
    except Exception as e:
        logger.error(f"Failed to get user: {e}")
        return None


def get_or_create_user(user_id: str, email: str = "") -> Dict:
    """DynamoDBからユーザーを取得、存在しない場合は作成"""
    user = get_user(user_id)
    if user:
        return user
    # ユーザーが存在しない場合は新規作成
    new_user = {
        "userId": user_id,
        "email": email,
        "createdAt": int(datetime.now().timestamp()),
    }
    try:
        users_table.put_item(Item=new_user)
        logger.info(f"Created new user: {user_id}")
        return new_user
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        return new_user


def update_user(user_id: str, updates: Dict) -> None:
    """DynamoDBのユーザーレコードを更新"""
    expr_parts = []
    attr_names = {}
    attr_values = {}
    for i, (key, value) in enumerate(updates.items()):
        placeholder = f"#k{i}"
        val_placeholder = f":v{i}"
        expr_parts.append(f"{placeholder} = {val_placeholder}")
        attr_names[placeholder] = key
        attr_values[val_placeholder] = value
    users_table.update_item(
        Key={"userId": user_id},
        UpdateExpression="SET " + ", ".join(expr_parts),
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
    )


def get_current_usage(user_id: str) -> Optional[Dict]:
    """現在の課金期間の usage レコードを取得"""
    try:
        resp = usage_table.query(
            KeyConditionExpression=Key("userId").eq(user_id),
            ScanIndexForward=False,
            Limit=1,
        )
        items = resp.get("Items", [])
        return items[0] if items else None
    except Exception as e:
        logger.error(f"Failed to get usage: {e}")
        return None


# ============================================================
# POST /api/stripe/create-checkout-session
# ============================================================

def handle_create_checkout_session(event: Dict) -> Dict:
    user_id = get_user_id(event)
    if not user_id:
        return create_response(401, error_code="unauthorized", error_message="認証が必要です")

    body = parse_event_body(event)
    if not body:
        return create_response(400, error_code="invalid_body", error_message="リクエストボディが不正です")

    price_id = body.get("price_id", STRIPE_STARTER_PRICE_ID)
    success_url = body.get("success_url", "")
    cancel_url = body.get("cancel_url", "")
    trial = body.get("trial", False)

    if not success_url or not cancel_url:
        return create_response(400, error_code="missing_urls", error_message="success_url と cancel_url は必須です")

    # ユーザーを取得または作成
    email = get_user_email(event)
    user = get_or_create_user(user_id, email)

    # 既存Subscription確認（二重登録防止）
    if user.get("stripe_subscription_id"):
        return create_response(409, error_code="subscription_exists", error_message="既にサブスクリプションが存在します")

    try:
        # Stripe Customer作成 or 取得
        customer_id = user.get("stripe_customer_id")
        if not customer_id:
            customer = stripe.Customer.create(
                email=user.get("email", ""),
                metadata={"user_id": user_id},
            )
            customer_id = customer.id
            update_user(user_id, {"stripe_customer_id": customer_id})

        # Checkout Session作成
        session_params = {
            "customer": customer_id,
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url + "?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": cancel_url,
        }
        if trial:
            session_params["subscription_data"] = {"trial_period_days": 14}
        session = stripe.checkout.Session.create(**session_params)

        return create_response(200, {"checkout_session_id": session.id, "url": session.url})

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        return create_response(500, error_code="stripe_error", error_message=str(e))


# ============================================================
# POST /api/stripe/create-portal-session
# ============================================================

def handle_create_portal_session(event: Dict) -> Dict:
    user_id = get_user_id(event)
    if not user_id:
        return create_response(401, error_code="unauthorized", error_message="認証が必要です")

    body = parse_event_body(event)
    return_url = body.get("return_url", "") if body else ""
    if not return_url:
        return create_response(400, error_code="missing_url", error_message="return_url は必須です")

    user = get_user(user_id)
    if not user or not user.get("stripe_customer_id"):
        return create_response(404, error_code="no_customer", error_message="Stripe顧客が見つかりません")

    try:
        session = stripe.billing_portal.Session.create(
            customer=user["stripe_customer_id"],
            return_url=return_url,
        )
        return create_response(200, {"url": session.url})

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        return create_response(500, error_code="stripe_error", error_message=str(e))


# ============================================================
# POST /api/stripe/change-plan
# ============================================================

def handle_change_plan(event: Dict) -> Dict:
    """アプリ内からのプラン変更（Portal では同一interval間の切り替えができないため）"""
    user_id = get_user_id(event)
    if not user_id:
        return create_response(401, error_code="unauthorized", error_message="認証が必要です")

    body = parse_event_body(event)
    if not body or not body.get("price_id"):
        return create_response(400, error_code="invalid_body", error_message="price_id は必須です")

    new_price_id = body["price_id"]
    immediate = body.get("immediate", True)  # デフォルトは即時変更
    end_trial = body.get("end_trial", False)  # トライアル即終了フラグ
    user = get_user(user_id)
    if not user or not user.get("stripe_subscription_id"):
        return create_response(404, error_code="no_subscription", error_message="サブスクリプションが見つかりません")

    try:
        subscription = stripe.Subscription.retrieve(user["stripe_subscription_id"])

        # 現在の subscription item を取得
        current_item = None
        for item in subscription["items"]["data"]:
            if "plan_type" in item["price"].get("metadata", {}):
                current_item = item
                break

        if not current_item:
            # メタデータがない場合は最初のitemを使用
            current_item = subscription["items"]["data"][0] if subscription["items"]["data"] else None

        if not current_item:
            return create_response(500, error_code="no_base_plan", error_message="ベースプランが見つかりません")

        # プラン変更
        if immediate:
            # 即時変更（アップグレード、トライアル→Pro）
            modify_params = {
                "items": [{"id": current_item["id"], "price": new_price_id}],
            }
            if end_trial:
                # トライアル終了 → フル課金（proration不要）
                modify_params["trial_end"] = "now"
            else:
                # 通常アップグレード → 日割り
                modify_params["proration_behavior"] = "create_prorations"
            stripe.Subscription.modify(subscription.id, **modify_params)
            return create_response(200, {"message": "プランを変更しました"})
        else:
            # ダウングレード: SubscriptionSchedule を使用して期間終了時に変更
            sub_dict = dict(subscription)

            # 既存のスケジュールがあれば解放
            if sub_dict.get("schedule"):
                stripe.SubscriptionSchedule.release(sub_dict["schedule"])

            # current_period は items.data[0] から取得（Stripe API v2024以降）
            current_period_start = current_item["current_period_start"]
            current_period_end = current_item["current_period_end"]
            schedule = stripe.SubscriptionSchedule.create(
                from_subscription=sub_dict["id"],
            )
            # フェーズを設定: 現在のプランを維持 → 期間終了後に新プランへ
            stripe.SubscriptionSchedule.modify(
                schedule.id,
                end_behavior="release",
                phases=[
                    {
                        # 現在のフェーズ: 既存プランを期間終了まで維持
                        "items": [{"price": current_item["price"]["id"], "quantity": 1}],
                        "start_date": current_period_start,
                        "end_date": current_period_end,
                    },
                    {
                        # 次のフェーズ: 新プランに変更（end_behaviorがreleaseなので継続）
                        "items": [{"price": new_price_id, "quantity": 1}],
                    },
                ],
            )
            # DBにスケジュール情報を保存（UI表示用）
            new_price = stripe.Price.retrieve(new_price_id)
            price_dict = dict(new_price)
            scheduled_plan_type = price_dict.get("metadata", {}).get("plan_type", "starter")
            update_user(user_id, {
                "scheduled_plan_type": scheduled_plan_type,
                "scheduled_change_at": datetime.fromtimestamp(current_period_end).isoformat() + "Z",
            })
            return create_response(200, {"message": "次回請求日からプランが変更されます"})

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        return create_response(500, error_code="stripe_error", error_message=str(e))


# ============================================================
# GET /api/subscription/status
# ============================================================

def handle_get_status(event: Dict) -> Dict:
    user_id = get_user_id(event)
    if not user_id:
        return create_response(401, error_code="unauthorized", error_message="認証が必要です")

    user = get_user(user_id)
    if not user:
        return create_response(404, error_code="user_not_found", error_message="ユーザーが見つかりません")

    usage = get_current_usage(user_id)
    effective_plan = get_effective_plan(user)
    rules = PLAN_RULES.get(effective_plan, PLAN_RULES["canceled"])

    return create_response(200, {
        "plan_type": user.get("plan_type", ""),
        "subscription_status": user.get("subscription_status", ""),
        "effective_plan": effective_plan,
        "article_count": int(usage.get("article_count", 0)) if usage else 0,
        "article_limit": rules["article_limit"],
        "decoration_count": int(usage.get("decoration_count", 0)) if usage else 0,
        "decoration_limit": rules["decoration_limit"],
        "current_period_end": user.get("current_period_end"),
        "cancel_at_period_end": user.get("canceled_at") is not None,
        "trial_end": user.get("trial_end"),
        "scheduled_plan_type": user.get("scheduled_plan_type"),
        "scheduled_change_at": user.get("scheduled_change_at"),
    })


# ============================================================
# GET /api/subscription/usage
# ============================================================

def handle_get_usage(event: Dict) -> Dict:
    user_id = get_user_id(event)
    if not user_id:
        return create_response(401, error_code="unauthorized", error_message="認証が必要です")

    user = get_user(user_id)
    if not user:
        return create_response(404, error_code="user_not_found", error_message="ユーザーが見つかりません")

    usage = get_current_usage(user_id)
    effective_plan = get_effective_plan(user)
    rules = PLAN_RULES.get(effective_plan, PLAN_RULES["canceled"])

    article_limit = rules["article_limit"]
    article_used = int(usage.get("article_count", 0)) if usage else 0

    if article_limit > 0:
        remaining = max(0, article_limit - article_used)
        percentage = round(article_used / article_limit * 100)
    elif article_limit == -1:
        remaining = -1
        percentage = 0
    else:
        remaining = 0
        percentage = 0

    return create_response(200, {
        "article_used": article_used,
        "article_limit": article_limit,
        "article_remaining": remaining,
        "article_percentage": percentage,
        "decoration_used": int(usage.get("decoration_count", 0)) if usage else 0,
        "decoration_limit": rules["decoration_limit"],
        "reset_date": user.get("current_period_end"),
        "is_trial": user.get("subscription_status") == "trialing",
    })


# ============================================================
# Lambda ハンドラー（ルーティング）
# ============================================================

def handler(event: Dict, context: Any) -> Dict:
    """Lambda関数のエントリポイント"""
    # OPTIONS (CORS preflight)
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return create_response(200, {})

    raw_path = event.get("rawPath", "")

    logger.info(json.dumps({"action": "request", "method": http_method, "path": raw_path}))

    try:
        if raw_path.endswith("/api/stripe/create-checkout-session") and http_method == "POST":
            return handle_create_checkout_session(event)
        elif raw_path.endswith("/api/stripe/create-portal-session") and http_method == "POST":
            return handle_create_portal_session(event)
        elif raw_path.endswith("/api/stripe/change-plan") and http_method == "POST":
            return handle_change_plan(event)
        elif raw_path.endswith("/api/subscription/status") and http_method == "GET":
            return handle_get_status(event)
        elif raw_path.endswith("/api/subscription/usage") and http_method == "GET":
            return handle_get_usage(event)
        else:
            return create_response(404, error_code="not_found", error_message="エンドポイントが見つかりません")

    except Exception as e:
        logger.error(f"Unhandled error: {e}", exc_info=True)
        return create_response(500, error_code="internal_error", error_message="内部エラーが発生しました")
