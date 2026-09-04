def check_action(
    action: str,
    retry_count: int,
    amount: float = 0
):
    MAX_RETRIES = 2
    HIGH_VALUE_LIMIT = 10000

    # Only these actions are allowed
    allowed_actions = {
        "retry_now",
        "retry_later",
        "ask_for_another_payment_method",
        "escalate"
    }

    # Block actions the system does not recognize
    if action not in allowed_actions:
        return {
            "allowed": False,
            "reason": "Unknown recovery action"
        }

    # Never retry a payment more than twice
    if action in {"retry_now", "retry_later"}:
        if retry_count >= MAX_RETRIES:
            return {
                "allowed": False,
                "reason": "Maximum retry limit reached"
            }

    # High-value payments need manual review
    if amount >= HIGH_VALUE_LIMIT:
        return {
            "allowed": False,
            "reason": "High-value payment requires manual review"
        }

    return {
        "allowed": True,
        "reason": "Action passed safety checks"
    }