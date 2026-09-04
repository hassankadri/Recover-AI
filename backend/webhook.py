import os
import hmac
import hashlib

from dotenv import load_dotenv

load_dotenv()


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

    if not secret:
        return False

    expected_signature = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(
        expected_signature,
        signature
    )