"""
プランルール定義（Source of Truth）

すべての利用制限・機能制約はここで一元管理する。
プラン追加・制限変更時はこのファイルだけ修正すればOK。
Stripe側の変更は不要。
"""

PLAN_RULES = {
    "trialing": {
        "article_limit": 10,
        "decoration_limit": 20,
        "features": {
            "export": True,
            "advanced_prompt": False,
        },
    },
    "starter": {
        "article_limit": 20,
        "decoration_limit": 50,
        "features": {
            "export": True,
            "advanced_prompt": False,
        },
    },
    "pro": {
        "article_limit": 150,
        "decoration_limit": -1,  # 無制限
        "features": {
            "export": True,
            "advanced_prompt": True,
        },
    },
    "canceled": {
        "article_limit": 0,
        "decoration_limit": 0,
        "features": {
            "export": True,  # 閲覧・エクスポートは可能
            "advanced_prompt": False,
        },
    },
}


def get_effective_plan(user: dict) -> str:
    """
    ユーザーの課金状態から有効プランを判定する。

    - trialing → 'trialing'
    - active / past_due → user['plan_type'] ('starter' or 'pro')
    - canceled / unpaid / その他 → 'canceled'
    """
    status = user.get("subscription_status", "")
    if status == "trialing":
        return "trialing"
    if status in ("active", "past_due"):
        return user.get("plan_type", "starter")
    return "canceled"


def get_plan_rules(user: dict) -> dict:
    """ユーザーの有効プランに対応するルールを返す"""
    plan = get_effective_plan(user)
    return PLAN_RULES.get(plan, PLAN_RULES["canceled"])
