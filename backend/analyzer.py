def analyze_payment(payment):
    if payment.failure_reason == "insufficient_funds":
        return {
            "reason": "Customer does not have enough funds",
            "recommended_action": "retry_later"
        }

    if payment.failure_reason == "network_error":
        return {
            "reason": "Temporary network problem",
            "recommended_action": "retry_now"
        }

    if payment.failure_reason == "card_declined":
        return {
            "reason": "The customer's card was declined",
            "recommended_action": "ask_for_another_payment_method"
        }

    return {
        "reason": "Unknown payment failure",
        "recommended_action": "escalate"
    }