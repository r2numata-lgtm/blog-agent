"""
プランルール定義（Source of Truth）- Webhook用コピー

subscription/plan_rules.py と同一内容。
Lambda関数ごとにデプロイされるため、同じファイルを配置する。
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
        "decoration_limit": -1,
        "features": {
            "export": True,
            "advanced_prompt": True,
        },
    },
    "canceled": {
        "article_limit": 0,
        "decoration_limit": 0,
        "features": {
            "export": True,
            "advanced_prompt": False,
        },
    },
}


def get_effective_plan(user: dict) -> str:
    status = user.get("subscription_status", "")
    if status == "trialing":
        return "trialing"
    if status in ("active", "past_due"):
        return user.get("plan_type", "starter")
    return "canceled"
