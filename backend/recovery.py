def execute_recovery_action(action: str, amount: float):

    if action == "retry_now":
        return {
            "action": "retry_now",
            "status": "recovered",
            "message": "Payment retry succeeded",
            "recovered_amount": amount
        }

    if action == "retry_later":
        return {
            "action": "retry_later",
            "status": "scheduled",
            "message": "Payment retry scheduled for later",
            "recovered_amount": 0
        }

    if action == "ask_for_another_payment_method":
        return {
            "action": "ask_for_another_payment_method",
            "status": "customer_action_required",
            "message": "Customer should provide another payment method",
            "recovered_amount": 0
        }

    return {
        "action": "escalate",
        "status": "escalated",
        "message": "Payment sent for manual review",
        "recovered_amount": 0
    }