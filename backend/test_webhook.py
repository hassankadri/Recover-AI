import json
import hmac
import hashlib
import requests
import os

from dotenv import load_dotenv

load_dotenv()

secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

if not secret:
    raise ValueError("RAZORPAY_WEBHOOK_SECRET is missing from .env")

payload = {
    "entity": "event",
    "event": "payment.failed",
    "payload": {
        "payment": {
            "entity": {
                "id": "pay_webhook_008",
                "amount": 249900,
                "status": "failed",
                "error_reason": "something_weird"
            }
        }
    }
}

body = json.dumps(payload).encode()

signature = hmac.new(
    secret.encode(),
    body,
    hashlib.sha256
).hexdigest()

response = requests.post(
    "http://127.0.0.1:8000/webhooks/razorpay",
    data=body,
    headers={
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature,
        "x-razorpay-event-id": "test_event_008"
    }
)

print("Status:", response.status_code)
print("Response:", response.json())