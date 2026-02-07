"""
Stripe Webhook Lambda関数

認証: Stripe-Signature ヘッダーで署名検証（Cognito認証不要）

監視イベント:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.paid
  - invoice.payment_failed
  - customer.subscription.trial_will_end
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

# ロガー
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 環境変数
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
DYNAMODB_TABLE_USERS = os.environ.get("DYNAMODB_TABLE_SETTINGS", "blog-agent-settings")
DYNAMODB_TABLE_USAGE = os.environ.get("DYNAMODB_TABLE_USAGE", "myblog-ai-usage")
DYNAMODB_TABLE_BILLING = os.environ.get("DYNAMODB_TABLE_BILLING", "myblog-ai-billing")
DYNAMODB_TABLE_WEBHOOK_EVENTS = os.environ.get("DYNAMODB_TABLE_WEBHOOK_EVENTS", "myblog-ai-webhook-events")

stripe.api_key = STRIPE_SECRET_KEY

# DynamoDB
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table(DYNAMODB_TABLE_USERS)
usage_table = dynamodb.Table(DYNAMODB_TABLE_USAGE)
billing_table = dynamodb.Table(DYNAMODB_TABLE_BILLING)
webhook_events_table = dynamodb.Table(DYNAMODB_TABLE_WEBHOOK_EVENTS)


# ============================================================
# ユーティリティ
# ============================================================

def create_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def get_user_by_customer_id(customer_id: str) -> Optional[Dict]:
    """stripe_customer_id でユーザーを検索"""
    try:
        resp = users_table.query(
            IndexName="stripe_customer_id-index",
            KeyConditionExpression=Key("stripe_customer_id").eq(customer_id),
            Limit=1,
        )
        items = resp.get("Items", [])
        return items[0] if items else None
    except Exception as e:
        logger.error(f"Failed to query user by customer_id: {e}")
        return None


def get_user_or_skip(customer_id: str) -> Optional[Dict]:
    """
    Webhookではユーザー作成しない。
    未存在ならログ出力してNone返却 → 呼び出し元で return して 200 を返す。
    """
    user = get_user_by_customer_id(customer_id)
    if not user:
        logger.warning(f"User not found for customer: {customer_id}")
        return None
    return user


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


def ts_to_iso(ts) -> Optional[str]:
    """Unix timestamp → ISO文字列。Noneなら None を返す。"""
    if ts is None:
        return None
    return datetime.utcfromtimestamp(int(ts)).isoformat() + "Z"


# ============================================================
# ヘルパー: ベースプラン判定
# ============================================================

def get_base_plan_item(subscription) -> Optional[dict]:
    """
    subscription.items.data から plan_type metadata を持つ
    ベースプランの item を返す。
    """
    for item in subscription["items"]["data"]:
        metadata = item.get("price", {}).get("metadata", {})
        if "plan_type" in metadata:
            return item
    return None


def get_base_plan_item_from_dict(items_data: list) -> Optional[dict]:
    """previous_attributes の items.data（dict形式）用"""
    for item in items_data:
        metadata = item.get("price", {}).get("metadata", {})
        if "plan_type" in metadata:
            return item
    return None


def get_subscription_line(invoice) -> Optional[dict]:
    """invoice.lines.data から subscription に紐づく line を安全に取得"""
    for line in invoice.get("lines", {}).get("data", []):
        if line.get("subscription"):
            return line
    return None


# ============================================================
# ヘルパー: usage リセット
# ============================================================

def reset_usage(user_id: str, period_start: str, period_end: str) -> None:
    """新しい課金期間の usage_monthly レコードを作成/リセット"""
    try:
        usage_table.put_item(
            Item={
                "userId": user_id,
                "period_start": period_start,
                "period_end": period_end,
                "article_count": 0,
                "decoration_count": 0,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
            }
        )
    except Exception as e:
        logger.error(f"Failed to reset usage: {e}")


# ============================================================
# 冪等性チェック
# ============================================================

def is_event_processed(event_id: str) -> bool:
    try:
        resp = webhook_events_table.get_item(Key={"stripe_event_id": event_id})
        item = resp.get("Item")
        return item is not None and item.get("processed", False)
    except Exception:
        return False


def record_event(event_id: str, event_type: str, processed: bool = False, error_message: str = "") -> None:
    try:
        webhook_events_table.put_item(
            Item={
                "stripe_event_id": event_id,
                "event_type": event_type,
                "processed": processed,
                "error_message": error_message,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "processed_at": datetime.utcnow().isoformat() + "Z" if processed else "",
            }
        )
    except Exception as e:
        logger.error(f"Failed to record webhook event: {e}")


# ============================================================
# イベントハンドラー
# ============================================================

def handle_subscription_created(event_data: dict) -> None:
    subscription = event_data["object"]

    user = get_user_or_skip(subscription["customer"])
    if not user:
        return

    base_item = get_base_plan_item(subscription)
    if not base_item:
        logger.error(f"No base plan item found: {subscription['id']}")
        return

    price_metadata = base_item["price"]["metadata"]

    update_user(user["userId"], {
        "stripe_subscription_id": subscription["id"],
        "stripe_price_id": base_item["price"]["id"],
        "plan_type": price_metadata["plan_type"],
        "subscription_status": subscription["status"],
        "trial_start": ts_to_iso(subscription.get("trial_start")),
        "trial_end": ts_to_iso(subscription.get("trial_end")),
        "current_period_start": ts_to_iso(subscription.get("current_period_start")),
        "current_period_end": ts_to_iso(subscription.get("current_period_end")),
        "subscription_updated_at": datetime.utcnow().isoformat() + "Z",
    })

    # 初期 usage レコード作成
    reset_usage(
        user["userId"],
        ts_to_iso(subscription.get("current_period_start")),
        ts_to_iso(subscription.get("current_period_end")),
    )


def handle_subscription_updated(event_data: dict) -> None:
    subscription = event_data["object"]
    previous = event_data.get("previous_attributes") or {}

    user = get_user_or_skip(subscription["customer"])
    if not user:
        return

    updates = {}

    # ステータスは常に同期（trialing→active等を確実に反映）
    updates["subscription_status"] = subscription["status"]

    # trial_end の更新（trial終了時にNoneになる）
    if "trial_end" in previous:
        updates["trial_end"] = ts_to_iso(subscription.get("trial_end"))

    # プラン変更（price変更）
    old_items = previous.get("items", {}).get("data", [])
    new_items = subscription.get("items", {}).get("data", [])

    if old_items and new_items:
        old_base = get_base_plan_item_from_dict(old_items)
        new_base = get_base_plan_item(subscription)

        if old_base and new_base:
            old_price_id = old_base["price"]["id"]
            new_price_id = new_base["price"]["id"]

            if old_price_id != new_price_id:
                price_metadata = new_base["price"]["metadata"]
                updates["stripe_price_id"] = new_price_id
                updates["plan_type"] = price_metadata["plan_type"]
    else:
        # items が previous に含まれていない場合でも、現在の price を確認
        new_base = get_base_plan_item(subscription)
        if new_base:
            price_metadata = new_base["price"]["metadata"]
            updates["stripe_price_id"] = new_base["price"]["id"]
            updates["plan_type"] = price_metadata["plan_type"]

    # 解約予約
    if subscription.get("cancel_at_period_end"):
        cancel_at = subscription.get("cancel_at")
        updates["canceled_at"] = ts_to_iso(cancel_at) or ts_to_iso(subscription.get("current_period_end"))

    # 共通フィールド
    updates["current_period_start"] = ts_to_iso(subscription.get("current_period_start"))
    updates["current_period_end"] = ts_to_iso(subscription.get("current_period_end"))
    updates["subscription_updated_at"] = datetime.utcnow().isoformat() + "Z"

    if updates:
        update_user(user["userId"], updates)


def handle_subscription_deleted(event_data: dict) -> None:
    subscription = event_data["object"]

    user = get_user_or_skip(subscription["customer"])
    if not user:
        return

    # plan_type は最後のプランを維持する（履歴・UI表示用）
    # 有効性の判定には subscription_status を使うこと
    # getEffectivePlan() → 'canceled' → PLAN_RULES.canceled.article_limit = 0
    update_user(user["userId"], {
        "subscription_status": "canceled",
        "subscription_updated_at": datetime.utcnow().isoformat() + "Z",
    })

    # TODO: send_cancellation_email(user)


def handle_invoice_paid(event_data: dict) -> None:
    invoice = event_data["object"]

    if not invoice.get("subscription"):
        return

    user = get_user_or_skip(invoice["customer"])
    if not user:
        return

    billing_reason = invoice.get("billing_reason", "")
    line = get_subscription_line(invoice)

    # 定期更新 or 初回課金時のみ usage リセット
    if billing_reason in ("subscription_cycle", "subscription_create"):
        if line:
            period = line.get("period", {})
            period_start = ts_to_iso(period.get("start"))
            period_end = ts_to_iso(period.get("end"))
            reset_usage(user["userId"], period_start, period_end)
            update_user(user["userId"], {
                "current_period_start": period_start,
                "current_period_end": period_end,
            })

    # 実際の課金があった場合のみ履歴記録
    amount_paid = invoice.get("amount_paid", 0)
    if amount_paid > 0:
        try:
            billing_table.put_item(
                Item={
                    "userId": user["userId"],
                    "stripe_invoice_id": invoice["id"],
                    "stripe_payment_intent": invoice.get("payment_intent", ""),
                    # 税込・実際の支払額（invoice.amount_paid をそのまま記録）
                    "amount": amount_paid,
                    "currency": invoice.get("currency", "jpy"),
                    "status": "paid",
                    "plan_type": user.get("plan_type", ""),
                    "period_start": ts_to_iso(line["period"]["start"]) if line else "",
                    "period_end": ts_to_iso(line["period"]["end"]) if line else "",
                    "paid_at": datetime.utcnow().isoformat() + "Z",
                    "created_at": datetime.utcnow().isoformat() + "Z",
                }
            )
        except Exception as e:
            logger.error(f"Failed to record billing history: {e}")


def handle_payment_failed(event_data: dict) -> None:
    invoice = event_data["object"]

    if not invoice.get("subscription"):
        return

    user = get_user_or_skip(invoice["customer"])
    if not user:
        return

    # subscription_status のみ更新。plan_type は変更しない
    update_user(user["userId"], {"subscription_status": "past_due"})

    # TODO: send_payment_failed_email(user, invoice)

    try:
        billing_table.put_item(
            Item={
                "userId": user["userId"],
                "stripe_invoice_id": invoice["id"],
                # 失敗時は「請求予定額（未回収）」を記録する。
                # paid の amount（= invoice.amount_paid = 実際の支払額）とは意味が異なる。
                # 会計処理では status='failed' のレコードを未回収として扱うこと。
                "amount": invoice.get("amount_due", 0),
                "currency": invoice.get("currency", "jpy"),
                "status": "failed",
                "plan_type": user.get("plan_type", ""),
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
        )
    except Exception as e:
        logger.error(f"Failed to record billing history: {e}")


def handle_trial_will_end(event_data: dict) -> None:
    subscription = event_data["object"]

    user = get_user_or_skip(subscription["customer"])
    if not user:
        return

    base_item = get_base_plan_item(subscription)
    if not base_item:
        logger.error(f"No base plan item found: {subscription['id']}")
        return

    # TODO: send_trial_ending_email(
    #     user=user,
    #     trial_end=subscription["trial_end"],
    #     plan_name=base_item["price"]["metadata"].get("display_name", "Starter"),
    #     amount=base_item["price"]["unit_amount"],
    # )
    logger.info(json.dumps({
        "action": "trial_will_end",
        "user_id": user["userId"],
        "trial_end": ts_to_iso(subscription.get("trial_end")),
    }))


def handle_subscription_schedule_completed(event_data: dict) -> None:
    """SubscriptionSchedule が完了した時（ダウングレードが実行された時）"""
    schedule = event_data["object"]
    subscription_id = schedule.get("subscription")

    if not subscription_id:
        return

    # subscription から customer_id を取得
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        customer_id = subscription["customer"]
    except Exception as e:
        logger.error(f"Failed to retrieve subscription: {e}")
        return

    user = get_user_or_skip(customer_id)
    if not user:
        return

    # スケジュール情報をクリア
    update_user(user["userId"], {
        "scheduled_plan_type": None,
        "scheduled_change_at": None,
    })

    logger.info(json.dumps({
        "action": "subscription_schedule_completed",
        "user_id": user["userId"],
        "subscription_id": subscription_id,
    }))


# ============================================================
# ハンドラーマッピング
# ============================================================

HANDLERS = {
    "customer.subscription.created": handle_subscription_created,
    "customer.subscription.updated": handle_subscription_updated,
    "customer.subscription.deleted": handle_subscription_deleted,
    "invoice.paid": handle_invoice_paid,
    "invoice.payment_failed": handle_payment_failed,
    "customer.subscription.trial_will_end": handle_trial_will_end,
    "subscription_schedule.completed": handle_subscription_schedule_completed,
}


# ============================================================
# Lambda ハンドラー
# ============================================================

def handler(event: Dict, context: Any) -> Dict:
    """Webhook Lambda関数のエントリポイント"""

    # リクエストボディ取得
    payload = event.get("body", "")
    if event.get("isBase64Encoded"):
        import base64
        payload = base64.b64decode(payload).decode("utf-8")

    sig_header = event.get("headers", {}).get("stripe-signature", "")

    # 署名検証
    try:
        stripe_event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid Stripe signature")
        return create_response(400, {"error": "Invalid signature"})
    except Exception as e:
        logger.error(f"Webhook construct error: {e}")
        return create_response(400, {"error": str(e)})

    event_id = stripe_event["id"]
    event_type = stripe_event["type"]

    logger.info(json.dumps({"action": "webhook_received", "event_id": event_id, "event_type": event_type}))

    # 冪等性チェック
    if is_event_processed(event_id):
        return create_response(200, {"status": "already_processed"})

    record_event(event_id, event_type, processed=False)

    # イベント処理
    event_handler = HANDLERS.get(event_type)
    if event_handler:
        try:
            event_handler(stripe_event["data"])
            record_event(event_id, event_type, processed=True)
        except Exception as e:
            logger.error(f"Webhook handler error: {event_type} {event_id} {e}", exc_info=True)
            record_event(event_id, event_type, processed=False, error_message=str(e))
            return create_response(500, {"error": "Handler failed"})
    else:
        # 未知のイベントは無視して200を返す
        record_event(event_id, event_type, processed=True)

    return create_response(200, {"status": "ok"})
