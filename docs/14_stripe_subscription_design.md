# Myblog AI Stripe構築設計書（確定版 v5）

## 1. 料金プラン

| プラン | 月額料金 | 記事上限 | 想定ユーザー |
|--------|---------|---------|-------------|
| Starter | ¥1,480/月（税込） | 20本 | 個人・副業 |
| Pro | ¥3,980/月（税込） | 150本 | 本気運用 |

- 無料プランなし
- 全ユーザー14日間トライアルからスタート
- トライアル中の記事上限: 10本
- 税込固定額として登録（Stripe Tax不使用）
- 消費税は内包価格。税率・税額は表示しない

### 価格表記ガイドライン

```
OK:
  「¥1,480（税込）」
  「¥1,480/月」 ← 注釈で「表示価格は税込です」
  「表示価格が最終お支払い金額です」

NG（免税事業者の間は避ける）:
  「消費税10%含む」
  「うち消費税 ¥134」
  「税抜 ¥1,345 + 税 ¥135」
```

---

## 2. Stripeリソース

### 2.1 Product

```json
{
  "name": "Myblog AI",
  "description": "AIブログ記事生成サービス",
  "metadata": {
    "service": "myblog_ai"
  }
}
```

### 2.2 Price: Starter

```json
{
  "product": "prod_xxx",
  "currency": "jpy",
  "unit_amount": 1480,
  "recurring": {
    "interval": "month",
    "interval_count": 1
  },
  "metadata": {
    "plan_type": "starter",
    "display_name": "Starter"
  },
  "lookup_key": "starter_monthly"
}
```

### 2.3 Price: Pro

```json
{
  "product": "prod_xxx",
  "currency": "jpy",
  "unit_amount": 3980,
  "recurring": {
    "interval": "month",
    "interval_count": 1
  },
  "metadata": {
    "plan_type": "pro",
    "display_name": "Pro"
  },
  "lookup_key": "pro_monthly"
}
```

### 2.4 Customer Portal設定

```json
{
  "business_profile": {
    "headline": "Myblog AI - プラン管理"
  },
  "features": {
    "subscription_update": {
      "enabled": true,
      "default_allowed_updates": ["price"],
      "proration_behavior": "create_prorations",
      "products": [
        {
          "product": "prod_xxx",
          "prices": ["price_starter_xxx", "price_pro_xxx"]
        }
      ]
    },
    "subscription_cancel": {
      "enabled": true,
      "mode": "at_period_end",
      "cancellation_reason": {
        "enabled": true,
        "options": [
          "too_expensive",
          "missing_features",
          "switched_service",
          "unused",
          "other"
        ]
      }
    },
    "payment_method_update": {
      "enabled": true
    },
    "invoice_history": {
      "enabled": true
    }
  }
}
```

### 2.5 Stripeの責務（明確化）

```
Stripeが管理するもの:
  - 課金状態（trialing / active / past_due / canceled）
  - プラン名（starter / pro）
  - 決済・請求・再試行

Stripeが管理しないもの:
  - 利用制限（記事数・装飾数）
  - 機能制約（高度なプロンプト等）
  - 利用量カウント

→ 利用制限・機能制約はすべてアプリ側で管理
```

---

## 3. アプリ側プランルール（Source of Truth）

### 3.1 PLAN_RULES

```typescript
// planRules.ts
// すべての利用制限・機能制約はここで一元管理する。
// プラン追加・制限変更時はこのファイルだけ修正すればOK。
// Stripe側の変更は不要。

export const PLAN_RULES = {
  trialing: {
    article_limit: 10,
    decoration_limit: 20,
    features: {
      export: true,
      advanced_prompt: false,
    },
  },

  starter: {
    article_limit: 20,
    decoration_limit: 50,
    features: {
      export: true,
      advanced_prompt: false,
    },
  },

  pro: {
    article_limit: 150,
    decoration_limit: -1, // 無制限
    features: {
      export: true,
      advanced_prompt: true,
    },
  },

  canceled: {
    article_limit: 0,
    decoration_limit: 0,
    features: {
      export: true,       // 閲覧・エクスポートは可能
      advanced_prompt: false,
    },
  },
} as const;

export type PlanType = keyof typeof PLAN_RULES;
```

### 3.2 有効プラン判定

```typescript
// subscription.ts

export function getEffectivePlan(user: User): PlanType {
  switch (user.subscription_status) {
    case 'trialing':
      return 'trialing';
    case 'active':
    case 'past_due':
      // past_due（支払い猶予中）でも機能は継続利用可能
      return user.plan_type; // 'starter' | 'pro'
    case 'canceled':
    case 'unpaid':
    default:
      return 'canceled';
  }
}
```

### 3.3 設計方針

```
Source of Truth:  PLAN_RULES（アプリ側コード）
Stripe metadata: 参考情報（plan_type の識別用のみ）
DB:               課金状態と利用量のみ保持

プラン追加時の作業:
  1. PLAN_RULES にエントリ追加
  2. Stripe に Price を追加（metadata に plan_type のみ）
  3. Customer Portal に Price を追加
  → DB の DDL 変更不要
```

---

## 4. データベース設計

### 4.1 users テーブル（既存に追加）

```sql
ALTER TABLE users ADD COLUMN (
  -- Stripe連携
  stripe_customer_id       VARCHAR(255) UNIQUE,
  stripe_subscription_id   VARCHAR(255),
  stripe_price_id          VARCHAR(255),

  -- プラン種別（Stripe Price metadata.plan_type と同期）
  -- ※ 解約後も最後のプランを維持する（履歴・UI表示用）
  -- ※ 有効性の判定には subscription_status を使うこと
  -- ※ 利用制限は PLAN_RULES で管理（DBには持たない）
  plan_type                VARCHAR(50) NOT NULL DEFAULT 'starter',

  -- サブスクリプション状態（Stripeのstatusと1:1で同期）
  subscription_status      ENUM('trialing', 'active', 'past_due', 'canceled', 'unpaid')
                           NOT NULL DEFAULT 'trialing',

  -- 期間
  trial_start              DATETIME,
  trial_end                DATETIME,
  current_period_start     DATETIME,
  current_period_end       DATETIME,
  canceled_at              DATETIME,
  subscription_updated_at  DATETIME
);
```

### 4.2 usage_monthly テーブル（新規）

```sql
CREATE TABLE usage_monthly (
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  user_id               INT NOT NULL,
  period_start          DATETIME NOT NULL,
  period_end            DATETIME NOT NULL,

  article_count         INT DEFAULT 0,
  decoration_count      INT DEFAULT 0,
  -- 将来の利用量カウントはここにカラム追加するだけ

  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE (user_id, period_start),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4.3 billing_history テーブル（新規）

```sql
CREATE TABLE billing_history (
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  user_id               INT NOT NULL,
  stripe_invoice_id     VARCHAR(255) UNIQUE,
  stripe_payment_intent VARCHAR(255),

  -- 金額（JPY）
  -- status='paid'   → 税込・実際の支払額（invoice.amount_paid）
  -- status='failed' → 請求予定額・未回収（invoice.amount_due）
  -- 消費税の内訳分離は会計処理側で行う（このテーブルでは扱わない）
  amount                INT NOT NULL,
  currency              VARCHAR(3) DEFAULT 'jpy',

  status                ENUM('paid', 'failed', 'pending', 'refunded'),
  plan_type             VARCHAR(50),
  period_start          DATETIME,
  period_end            DATETIME,
  paid_at               DATETIME,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4.4 stripe_webhook_events テーブル（新規・冪等性確保用）

```sql
CREATE TABLE stripe_webhook_events (
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  stripe_event_id       VARCHAR(255) UNIQUE NOT NULL,
  event_type            VARCHAR(100) NOT NULL,
  processed             BOOLEAN DEFAULT FALSE,
  payload               JSON,
  error_message         TEXT,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at          DATETIME
);
```

### 4.5 状態の組み合わせ一覧

```
plan_type   subscription_status   effective_plan   article_limit(※)
─────────   ───────────────────   ──────────────   ─────────────────
starter     trialing              trialing         10
starter     active                starter          20
pro         active                pro              150
starter     past_due              starter          20
pro         past_due              pro              150
starter     canceled              canceled         0
pro         canceled              canceled         0

※ article_limit は PLAN_RULES から取得（DBには保持しない）
```

---

## 5. トライアル設計

| 項目 | 値 |
|------|-----|
| 期間 | 14日間 |
| 初期 plan_type | starter |
| 初期 subscription_status | trialing |
| 記事上限 | 10本（PLAN_RULES.trialing.article_limit） |
| カード | 必須（Checkout Session時に登録） |
| 終了後 | 自動でStarter課金開始（¥1,480） |
| 終了通知 | 3日前にメール（trial_will_end Webhook） |

---

## 6. 主要ユーザーフロー

### 6.1 ユーザー登録 → トライアル開始

```
1. ユーザーがアプリに登録（Cognito認証）
2. アプリ側で Stripe Customer を作成
   └─ stripe_customer_id をDBに保存
3. 料金ページで「無料で始める」クリック
4. Checkout Session を作成
   ├─ customer: stripe_customer_id
   ├─ mode: 'subscription'
   ├─ line_items: [{ price: 'price_starter_xxx', quantity: 1 }]
   └─ subscription_data.trial_period_days: 14
5. Stripeの決済画面へリダイレクト
6. カード登録完了 → success_url へリダイレクト
7. Webhook: customer.subscription.created
   ├─ plan_type = 'starter'
   ├─ subscription_status = 'trialing'
   └─ usage_monthly レコード作成（count = 0）
```

### 6.2 トライアル中

```
- subscription_status = 'trialing'
- getEffectivePlan() → 'trialing'
- PLAN_RULES.trialing.article_limit → 10
- 記事生成ごとに usage_monthly.article_count += 1
- 10本到達 → 生成ブロック + アップグレード誘導
```

### 6.3 トライアル終了 → 課金開始

```
1. トライアル終了3日前
   └─ Webhook: customer.subscription.trial_will_end
   └─ メール送信:「3日後にStarterプラン（¥1,480/月）に移行します」

2. トライアル終了日
   └─ Stripe が自動で初回課金を実行
   └─ Webhook: invoice.paid (billing_reason='subscription_create')
       ├─ usage_monthly リセット（新しい period で作成）
       └─ 課金履歴を記録
   └─ Webhook: customer.subscription.updated (status: active)
       └─ subscription_status = 'active'
       └─ getEffectivePlan() → 'starter' → article_limit = 20
```

### 6.4 月次更新

```
1. current_period_end に到達
2. Stripe が自動課金
3. Webhook: invoice.paid (billing_reason='subscription_cycle')
   ├─ usage_monthly リセット（新しい period で作成）
   ├─ current_period_start/end 更新
   └─ 課金履歴を記録
```

### 6.5 プランアップグレード（Starter → Pro）

```
1. Customer Portal で Pro を選択
   └─ または アプリ内UIから Subscription.modify()
2. Stripe が日割り計算を自動実行
3. Webhook: customer.subscription.updated
   ├─ plan_type = 'pro'
   └─ usage_monthly.article_count は維持（リセットしない）
   └─ getEffectivePlan() → 'pro' → article_limit = 150
4. Webhook: invoice.paid (billing_reason='subscription_update')
   └─ 日割り差額の課金履歴を記録
   └─ usage はリセットしない（subscription_cycle のみ）
```

### 6.6 プランダウングレード（Pro → Starter）

```
1. Customer Portal で Starter を選択
2. Stripe が日割り計算（クレジット）
3. Webhook: customer.subscription.updated
   ├─ plan_type = 'starter'
   └─ usage_monthly.article_count は維持
   └─ getEffectivePlan() → 'starter' → article_limit = 20
4. article_count > 20 の場合
   └─ 次回の記事生成からブロック
   └─ UIに案内表示（DowngradedNotice）
```

### 6.7 解約

```
1. Customer Portal で「解約」
2. cancel_at_period_end = true に設定
3. Webhook: customer.subscription.updated
   └─ canceled_at を記録
   └─ subscription_status は維持（active のまま）
4. current_period_end まで全機能利用可能
5. 期間終了時
   └─ Webhook: customer.subscription.deleted
   ├─ subscription_status = 'canceled'
   ├─ plan_type = 維持（履歴用）
   └─ 解約完了メール送信
6. 解約後
   └─ 既存記事の閲覧・エクスポートは可能
   └─ 新規記事生成は不可
```

### 6.8 支払い失敗

```
1. 課金失敗
   └─ Webhook: invoice.payment_failed
   ├─ subscription_status = 'past_due'
   ├─ plan_type は変更しない
   └─ 支払い失敗メール送信

2. Stripe Smart Retries（自動再試行）
   ├─ 1回目失敗 → 約3日後に再試行
   ├─ 2回目失敗 → 約5日後に再試行
   └─ 3回目失敗 → subscription canceled

3. 猶予期間中
   ├─ 機能は継続利用可能
   ├─ UIに支払い失敗の警告バナー表示
   └─ カード更新を促すCTA表示

4. 最終的に失敗
   └─ Webhook: customer.subscription.deleted
   └─ 解約と同じ処理
```

---

## 7. APIエンドポイント

### 7.1 一覧

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/api/stripe/create-checkout-session` | 必須 | Checkout Session作成 |
| POST | `/api/stripe/create-portal-session` | 必須 | Customer Portal Session作成 |
| POST | `/api/stripe/webhook` | 署名検証 | Webhook受信 |
| GET | `/api/subscription/status` | 必須 | プラン状態取得 |
| GET | `/api/subscription/usage` | 必須 | 記事使用量取得 |

### 7.2 POST /api/stripe/create-checkout-session

**リクエスト:**
```json
{
  "price_id": "price_starter_xxx",
  "success_url": "https://app.example.com/subscription/success",
  "cancel_url": "https://app.example.com/pricing"
}
```

**処理フロー:**
```python
def create_checkout_session(request):
    user = get_authenticated_user(request)

    # 既存Customer確認。なければ作成
    if not user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
        user.update(stripe_customer_id=customer.id)

    # 既存Subscription確認（二重登録防止）
    if user.stripe_subscription_id:
        raise ConflictError("既にサブスクリプションが存在します")

    session = stripe.checkout.Session.create(
        customer=user.stripe_customer_id,
        mode='subscription',
        line_items=[{
            'price': request.price_id,
            'quantity': 1,
        }],
        subscription_data={
            'trial_period_days': 14,
        },
        success_url=request.success_url + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url=request.cancel_url,
    )

    return {"checkout_session_id": session.id, "url": session.url}
```

**レスポンス:**
```json
{
  "checkout_session_id": "cs_xxx",
  "url": "https://checkout.stripe.com/c/pay/cs_xxx..."
}
```

### 7.3 POST /api/stripe/create-portal-session

**リクエスト:**
```json
{
  "return_url": "https://app.example.com/settings"
}
```

**処理フロー:**
```python
def create_portal_session(request):
    user = get_authenticated_user(request)

    if not user.stripe_customer_id:
        raise NotFoundError("Stripe顧客が見つかりません")

    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=request.return_url,
    )

    return {"url": session.url}
```

**レスポンス:**
```json
{
  "url": "https://billing.stripe.com/p/session/xxx..."
}
```

### 7.4 POST /api/stripe/webhook

```python
def handle_webhook(request):
    # 署名検証
    payload = request.body
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.environ['STRIPE_WEBHOOK_SECRET']

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise BadRequestError("Invalid signature")

    # 冪等性チェック
    existing = WebhookEvent.get_by_stripe_event_id(event.id)
    if existing and existing.processed:
        return {"status": "already_processed"}

    if not existing:
        WebhookEvent.create(
            stripe_event_id=event.id,
            event_type=event.type,
            payload=event.data,
            processed=False,
        )

    # イベント処理
    try:
        handler = HANDLERS.get(event.type)
        if handler:
            handler(event)
        WebhookEvent.mark_processed(event.id)
    except Exception as e:
        WebhookEvent.mark_error(event.id, str(e))
        logger.error(f"Webhook error: {event.type} {event.id} {e}")
        raise

    return {"status": "ok"}

HANDLERS = {
    'customer.subscription.created':        handle_subscription_created,
    'customer.subscription.updated':        handle_subscription_updated,
    'customer.subscription.deleted':        handle_subscription_deleted,
    'invoice.paid':                         handle_invoice_paid,
    'invoice.payment_failed':               handle_payment_failed,
    'customer.subscription.trial_will_end': handle_trial_will_end,
}
```

### 7.5 GET /api/subscription/status

**処理フロー:**
```python
def get_subscription_status(request):
    user = get_authenticated_user(request)
    usage = get_current_usage(user.id)
    effective_plan = get_effective_plan(user)
    rules = PLAN_RULES[effective_plan]

    return {
        "plan_type": user.plan_type,
        "subscription_status": user.subscription_status,
        "effective_plan": effective_plan,
        "article_count": usage.article_count if usage else 0,
        "article_limit": rules['article_limit'],
        "decoration_count": usage.decoration_count if usage else 0,
        "decoration_limit": rules['decoration_limit'],
        "current_period_end": user.current_period_end,
        "cancel_at_period_end": user.canceled_at is not None,
        "trial_end": user.trial_end,
    }
```

**レスポンス（通常時）:**
```json
{
  "plan_type": "starter",
  "subscription_status": "active",
  "effective_plan": "starter",
  "article_count": 5,
  "article_limit": 20,
  "decoration_count": 12,
  "decoration_limit": 50,
  "current_period_end": "2025-03-01T00:00:00Z",
  "cancel_at_period_end": false,
  "trial_end": null
}
```

**レスポンス（トライアル中）:**
```json
{
  "plan_type": "starter",
  "subscription_status": "trialing",
  "effective_plan": "trialing",
  "article_count": 3,
  "article_limit": 10,
  "decoration_count": 5,
  "decoration_limit": 20,
  "current_period_end": "2025-02-19T00:00:00Z",
  "cancel_at_period_end": false,
  "trial_end": "2025-02-19T00:00:00Z"
}
```

### 7.6 GET /api/subscription/usage

**処理フロー:**
```python
def get_subscription_usage(request):
    user = get_authenticated_user(request)
    usage = get_current_usage(user.id)
    effective_plan = get_effective_plan(user)
    rules = PLAN_RULES[effective_plan]

    article_limit = rules['article_limit']
    article_used = usage.article_count if usage else 0

    return {
        "article_used": article_used,
        "article_limit": article_limit,
        "article_remaining": max(0, article_limit - article_used) if article_limit != -1 else -1,
        "article_percentage": round(article_used / article_limit * 100) if article_limit > 0 else 0,
        "decoration_used": usage.decoration_count if usage else 0,
        "decoration_limit": rules['decoration_limit'],
        "reset_date": user.current_period_end,
        "is_trial": user.subscription_status == 'trialing',
    }
```

**レスポンス:**
```json
{
  "article_used": 5,
  "article_limit": 20,
  "article_remaining": 15,
  "article_percentage": 25,
  "decoration_used": 12,
  "decoration_limit": 50,
  "reset_date": "2025-03-01T00:00:00Z",
  "is_trial": false
}
```

---

## 8. Webhook処理詳細

### 8.1 ユーザー取得ヘルパー

```python
def get_user_or_skip(customer_id):
    """
    Webhookではユーザー作成しない。
    未存在ならログ出力してNone返却 → 呼び出し元で return して 200 を返す。
    """
    user = get_user_by_stripe_customer_id(customer_id)
    if not user:
        logger.warning(f"User not found for customer: {customer_id}")
        return None
    return user
```

### 8.2 ベースプラン判定ヘルパー

```python
def get_base_plan_item(subscription):
    """
    subscription.items.data から plan_type metadata を持つ
    ベースプランの item を返す。
    将来 add-on / 従量課金 / 複数 item が入っても
    ベースプランだけを正しく取得できる。
    """
    for item in subscription.items.data:
        if 'plan_type' in item.price.metadata:
            return item
    return None


def get_base_plan_item_from_dict(items_data):
    """
    previous_attributes の items.data（dict形式）から
    ベースプランの item を返す。Webhook の previous 用。
    """
    for item in items_data:
        if 'plan_type' in item.get('price', {}).get('metadata', {}):
            return item
    return None
```

### 8.3 invoice line 取得ヘルパー

```python
def get_subscription_line(invoice):
    """
    invoice.lines.data から subscription に紐づく line を安全に取得する。
    将来 add-on / クーポン / 複数line が入っても正しい line を返す。
    """
    return next(
        (line for line in invoice.lines.data if line.subscription),
        None
    )
```

### 8.4 usage リセットヘルパー

```python
def reset_usage(user_id, period_start, period_end):
    """
    新しい課金期間の usage_monthly レコードを作成する。
    既存レコードがある場合は upsert でリセットする。
    """
    UsageMonthly.upsert(
        user_id=user_id,
        period_start=period_start,
        period_end=period_end,
        defaults={
            'article_count': 0,
            'decoration_count': 0,
        },
    )
```

### 8.5 customer.subscription.created

```python
def handle_subscription_created(event):
    subscription = event.data.object

    user = get_user_or_skip(subscription.customer)
    if not user:
        return

    base_item = get_base_plan_item(subscription)
    if not base_item:
        logger.error(f"No base plan item found: {subscription.id}")
        return

    price_metadata = base_item.price.metadata

    user.update(
        stripe_subscription_id=subscription.id,
        stripe_price_id=base_item.price.id,
        plan_type=price_metadata['plan_type'],       # 'starter'
        subscription_status=subscription.status,      # 'trialing'
        trial_start=subscription.trial_start,
        trial_end=subscription.trial_end,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
    )

    # 初期 usage レコード作成
    reset_usage(
        user.id,
        subscription.current_period_start,
        subscription.current_period_end,
    )
```

### 8.6 customer.subscription.updated

```python
def handle_subscription_updated(event):
    subscription = event.data.object
    previous = event.data.previous_attributes or {}

    user = get_user_or_skip(subscription.customer)
    if not user:
        return

    updates = {}

    # --- ステータス変更（trialing→active, active→past_due 等） ---
    if 'status' in previous:
        updates['subscription_status'] = subscription.status

    # --- プラン変更（price変更）---
    # previous items を安全に取得
    old_items = previous.get('items', {}).get('data', [])
    new_items = subscription.items.data

    if old_items and new_items:
        old_base = get_base_plan_item_from_dict(old_items)
        new_base = get_base_plan_item(subscription)

        if old_base and new_base:
            old_price_id = old_base['price']['id']
            new_price_id = new_base.price.id

            if old_price_id != new_price_id:
                price_metadata = new_base.price.metadata
                updates['stripe_price_id'] = new_base.price.id
                updates['plan_type'] = price_metadata['plan_type']
                # 利用制限には一切触らない（PLAN_RULES で自動的に変わる）

    # --- 解約予約 ---
    if subscription.cancel_at_period_end:
        updates['canceled_at'] = subscription.cancel_at or subscription.current_period_end

    # --- 共通フィールド ---
    updates['current_period_start'] = subscription.current_period_start
    updates['current_period_end'] = subscription.current_period_end
    updates['subscription_updated_at'] = datetime.now()

    user.update(**updates)
```

### 8.7 customer.subscription.deleted

```python
def handle_subscription_deleted(event):
    subscription = event.data.object

    user = get_user_or_skip(subscription.customer)
    if not user:
        return

    # plan_type は最後のプランを維持する（履歴・UI表示用）
    # 有効性の判定には subscription_status を使うこと
    # getEffectivePlan() → 'canceled' → PLAN_RULES.canceled.article_limit = 0
    user.update(
        subscription_status='canceled',
    )

    send_cancellation_email(user)
```

### 8.8 invoice.paid

```python
def handle_invoice_paid(event):
    invoice = event.data.object

    if not invoice.subscription:
        return

    user = get_user_or_skip(invoice.customer)
    if not user:
        return

    billing_reason = invoice.billing_reason
    # 'subscription_create'  → 初回課金（トライアル終了後）
    # 'subscription_cycle'   → 定期更新
    # 'subscription_update'  → プラン変更の日割り

    line = get_subscription_line(invoice)

    # 定期更新 or 初回課金時のみ usage リセット
    if billing_reason in ('subscription_cycle', 'subscription_create'):
        if line:
            reset_usage(user.id, line.period.start, line.period.end)
            user.update(
                current_period_start=line.period.start,
                current_period_end=line.period.end,
            )

    # 実際の課金があった場合のみ履歴記録
    # amount = 税込・実際の支払額（invoice.amount_paid をそのまま記録）
    if invoice.amount_paid > 0:
        BillingHistory.create(
            user_id=user.id,
            stripe_invoice_id=invoice.id,
            stripe_payment_intent=invoice.payment_intent,
            amount=invoice.amount_paid,
            status='paid',
            plan_type=user.plan_type,
            period_start=line.period.start if line else None,
            period_end=line.period.end if line else None,
            paid_at=datetime.now(),
        )
```

### 8.9 invoice.payment_failed

```python
def handle_payment_failed(event):
    invoice = event.data.object

    if not invoice.subscription:
        return

    user = get_user_or_skip(invoice.customer)
    if not user:
        return

    # subscription_status のみ更新。plan_type は変更しない
    user.update(subscription_status='past_due')

    send_payment_failed_email(user, invoice)

    BillingHistory.create(
        user_id=user.id,
        stripe_invoice_id=invoice.id,
        # 失敗時は「請求予定額（未回収）」を記録する。
        # paid の amount（= invoice.amount_paid = 実際の支払額）とは意味が異なる。
        # 会計処理では status='failed' のレコードを未回収として扱うこと。
        amount=invoice.amount_due,
        status='failed',
        plan_type=user.plan_type,
    )
```

### 8.10 customer.subscription.trial_will_end

```python
def handle_trial_will_end(event):
    subscription = event.data.object

    user = get_user_or_skip(subscription.customer)
    if not user:
        return

    base_item = get_base_plan_item(subscription)
    if not base_item:
        logger.error(f"No base plan item found: {subscription.id}")
        return

    price = base_item.price

    send_trial_ending_email(
        user=user,
        trial_end=subscription.trial_end,
        plan_name=price.metadata.get('display_name', 'Starter'),
        amount=price.unit_amount,
    )
```

---

## 9. 上限チェックロジック

### 9.1 記事数チェック

```python
def check_article_limit(user):
    """記事生成リクエスト時に呼び出す"""
    effective_plan = get_effective_plan(user)
    rules = PLAN_RULES[effective_plan]
    limit = rules['article_limit']

    if limit == 0:
        raise ArticleLimitError(
            code='subscription_canceled',
            message='サブスクリプションが無効です',
        )

    usage = get_current_usage(user.id)
    current_count = usage.article_count if usage else 0

    if limit != -1 and current_count >= limit:
        raise ArticleLimitError(
            code='limit_reached',
            message=f'今月の記事生成上限（{limit}本）に達しました',
            current=current_count,
            limit=limit,
        )

    return True


def after_article_generated(user):
    """記事生成成功後に呼び出す"""
    usage = get_current_usage(user.id)
    if usage:
        usage.update(article_count=usage.article_count + 1)
```

### 9.2 装飾数チェック（将来対応）

```python
def check_decoration_limit(user):
    """装飾適用リクエスト時に呼び出す"""
    effective_plan = get_effective_plan(user)
    rules = PLAN_RULES[effective_plan]
    limit = rules['decoration_limit']

    if limit == -1:
        return True  # 無制限

    usage = get_current_usage(user.id)
    current_count = usage.decoration_count if usage else 0

    if current_count >= limit:
        raise DecorationLimitError(
            code='decoration_limit_reached',
            message=f'今月の装飾上限（{limit}回）に達しました',
            current=current_count,
            limit=limit,
        )

    return True


def after_decoration_applied(user):
    """装飾適用成功後に呼び出す"""
    usage = get_current_usage(user.id)
    if usage:
        usage.update(decoration_count=usage.decoration_count + 1)
```

---

## 10. フロントエンド

### 10.1 コンポーネント構成

```
src/
├── components/subscription/
│   ├── PricingTable.tsx         # 料金プラン表示・選択
│   ├── UsageIndicator.tsx       # 記事使用量バー
│   ├── PlanBadge.tsx            # 現在プランのバッジ表示
│   ├── TrialBanner.tsx          # トライアル残日数バナー
│   ├── PaymentFailedBanner.tsx  # 支払い失敗警告バナー
│   └── DowngradedNotice.tsx     # ダウングレード後の案内
├── pages/subscription/
│   ├── PricingPage.tsx          # 料金ページ
│   ├── SuccessPage.tsx          # Checkout成功ページ
│   └── SettingsPage.tsx         # プラン管理（Portal誘導）
└── hooks/
    └── useSubscription.ts       # サブスクリプション状態管理
```

### 10.2 PricingTable

```tsx
const PLANS = [
  {
    name: 'Starter',
    price: 1480,
    priceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
    features: [
      '月20本まで記事生成',
      'WordPress / Markdown出力',
      '記事の保存・再編集・エクスポート',
    ],
    recommended: false,
  },
  {
    name: 'Pro',
    price: 3980,
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    features: [
      '月150本まで記事生成',
      'WordPress / Markdown出力',
      '記事の保存・再編集・エクスポート',
    ],
    recommended: true,
  },
];

// 価格表記: 「¥1,480（税込）/ 月」
// 注釈: 「表示価格が最終お支払い金額です」
```

### 10.3 Checkout呼び出し

```tsx
const handleSubscribe = async (priceId: string) => {
  const response = await api.post('/api/stripe/create-checkout-session', {
    price_id: priceId,
    success_url: `${window.location.origin}/subscription/success`,
    cancel_url: `${window.location.origin}/pricing`,
  });

  window.location.href = response.data.url;
};
```

### 10.4 Customer Portal呼び出し

```tsx
const handleManagePlan = async () => {
  const response = await api.post('/api/stripe/create-portal-session', {
    return_url: `${window.location.origin}/settings`,
  });

  window.location.href = response.data.url;
};
```

### 10.5 UsageIndicator

```tsx
const UsageIndicator = () => {
  const { data } = useSubscriptionUsage();
  if (!data) return null;

  const percentage = data.article_percentage;
  const isWarning = percentage >= 80;

  return (
    <div>
      <div>今月の記事生成: {data.article_used} / {data.article_limit} 本</div>
      <ProgressBar value={percentage} warning={isWarning} />
      {isWarning && <span>上限に近づいています</span>}
    </div>
  );
};
```

### 10.6 TrialBanner

```tsx
const TrialBanner = () => {
  const { data } = useSubscriptionStatus();
  if (!data || data.subscription_status !== 'trialing') return null;

  const daysLeft = Math.ceil(
    (new Date(data.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Banner variant={daysLeft <= 3 ? 'warning' : 'info'}>
      無料トライアル残り{daysLeft}日
      ・トライアル終了後、Starterプラン（¥1,480/月・税込）に自動移行します
    </Banner>
  );
};
```

### 10.7 DowngradedNotice

```tsx
const DowngradedNotice = () => {
  const { data } = useSubscriptionStatus();
  if (!data) return null;

  // ダウングレード後に使用量が新上限を超えている場合のみ表示
  if (data.article_count <= data.article_limit) return null;

  return (
    <Banner variant="info">
      今月はProプランの枠で{data.article_count}本生成済みです。
      新しい上限（{data.article_limit}本）を超えているため、
      今月の追加生成はできません。
      次回更新日（{formatDate(data.current_period_end)}）にリセットされます。
    </Banner>
  );
};
```

### 10.8 PaymentFailedBanner

```tsx
const PaymentFailedBanner = () => {
  const { data } = useSubscriptionStatus();
  if (!data || data.subscription_status !== 'past_due') return null;

  return (
    <Banner variant="error">
      お支払いに失敗しました。カード情報をご確認ください。
      <Button onClick={handleManagePlan}>カードを更新する</Button>
    </Banner>
  );
};
```

---

## 11. 環境変数

### バックエンド

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_STARTER_PRICE_ID=price_starter_xxx
STRIPE_PRO_PRICE_ID=price_pro_xxx
```

### フロントエンド

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_STRIPE_STARTER_PRICE_ID=price_starter_xxx
VITE_STRIPE_PRO_PRICE_ID=price_pro_xxx
```

---

## 12. エラーハンドリング

| シナリオ | 検出 | UI対応 |
|---------|------|--------|
| 記事上限到達 | article_count >= PLAN_RULES limit | 生成ブロック + アップグレード誘導 |
| 装飾上限到達 | decoration_count >= PLAN_RULES limit | 装飾ブロック + アップグレード誘導 |
| ダウングレード後の超過 | article_count > 新プランlimit | DowngradedNotice 表示 |
| 支払い失敗 | subscription_status == 'past_due' | PaymentFailedBanner + カード更新CTA |
| トライアル終了間近 | trial_end - now <= 3日 | TrialBanner 強調表示 |
| 解約済み | subscription_status == 'canceled' | 生成不可 + 再登録誘導 |
| Webhook署名不正 | SignatureVerificationError | 400返却 + ログ記録 |
| Webhookユーザー未存在 | get_user_or_skip() == None | log warning + 200返却 |
| ベースプランitem未発見 | get_base_plan_item() == None | log error + 処理スキップ |

---

## 13. グレースピリオド（支払い失敗時）

```
1回目失敗 → 約3日後に自動再試行（Stripe Smart Retries）
2回目失敗 → 約5日後に自動再試行
3回目失敗 → subscription canceled

猶予期間中:
  subscription_status = 'past_due'
  plan_type = 変更しない（starter or pro のまま）
  getEffectivePlan() → plan_type を返す（機能継続）
  UI = PaymentFailedBanner + カード更新ボタン
```

---

## 14. テスト

### 14.1 テストカード

| カード番号 | 説明 |
|-----------|------|
| 4242 4242 4242 4242 | 成功 |
| 4000 0000 0000 0341 | カード拒否 |
| 4000 0000 0000 3220 | 3Dセキュア必須 |

### 14.2 テストシナリオ

```
 1. 新規登録 → トライアル開始（plan_type=starter, status=trialing, PLAN_RULES→limit=10）
 2. トライアル中に記事10本生成 → 上限到達 → ブロック確認
 3. トライアル終了 → status=active, PLAN_RULES→limit=20 確認
 4. 月次更新 → usage_monthly リセット確認
 5. Starter → Pro アップグレード → PLAN_RULES→limit=150, usage維持 確認
 6. Pro → Starter ダウングレード → PLAN_RULES→limit=20, DowngradedNotice表示確認
 7. 解約 → cancel_at_period_end=true → 期間終了後 canceled 確認
 8. 支払い失敗 → status=past_due, plan_type維持, バナー表示確認
 9. Webhook二重送信 → 冪等性確認（2回目は already_processed）
10. Webhookユーザー未存在 → 200返却 + ログ確認
11. get_base_plan_item 未発見 → エラーログ + 処理スキップ確認
12. 装飾数上限チェック → PLAN_RULES 参照で正しくブロック確認
```

---

## 15. 変更履歴

| バージョン | 変更内容 |
|-----------|---------|
| v2 | plan_type/subscription_status分離、billing_reason分岐、Webhookユーザー未存在ガード、payment_failedでplan_type維持 |
| v3 | get_subscription_line()導入、subscription.updatedのprice_id比較、DowngradedNotice追加、billing_history.amountコメント、価格表記ガイドライン |
| v3.1 | payment_failed amountコメント強化、previous items安全取得チェーン化、canceled_at Noneフォールバック |
| v4 | サービス名をMyblog AIに変更、items[0]決め打ち排除→get_base_plan_item()集約、plan_type ENUMをVARCHAR(50)に変更 |
| v5 | PLAN_RULES導入（利用制限のSource of Truthをアプリ側に移行）、Stripe metadata から article_limit 削除、users テーブルから article_count/article_limit 削除、usage_monthly テーブル新設、装飾数カウント対応、Webhookから利用制限の更新処理を削除 |
