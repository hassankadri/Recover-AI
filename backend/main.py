from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func

from schemas import Payment
from database import engine, Base, SessionLocal
from models import PaymentDB, WebhookEventDB, AuditLogDB
from agent_graph import recovery_graph
from webhook import verify_webhook_signature


app = FastAPI(title="RecoverAI")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables
Base.metadata.create_all(bind=engine)


@app.get("/")
def home():
    return {
        "message": "RecoverAI is running!"
    }


# Manual payment endpoint
@app.post("/payments")
def create_payment(payment: Payment):

    # Run payment through the RecoverAI agent
    result = recovery_graph.invoke({
        "payment": payment
    })

    db = SessionLocal()

    payment_db = PaymentDB(
        payment_id=payment.payment_id,
        customer_id=payment.customer_id,
        amount=payment.amount,
        status=payment.status,
        failure_reason=payment.failure_reason,
        retry_count=0,
        recovery_status=result["recovery_action"]["status"],
        recovered_amount=result["recovery_action"]["recovered_amount"]
    )

    db.add(payment_db)
    db.commit()
    db.refresh(payment_db)
    db.close()

    return {
        "message": "Payment processed",
        "payment": payment,
        "analysis": result["analysis"],
        "ai_decision": result["ai_decision"],
        "safety_check": result["safety_check"],
        "recovery_action": result["recovery_action"]
    }


# Dashboard
@app.get("/dashboard")
def get_dashboard():

    db = SessionLocal()

    total_payments = db.query(PaymentDB).count()

    total_at_risk = (
        db.query(func.sum(PaymentDB.amount)).scalar()
        or 0
    )

    total_recovered = (
        db.query(func.sum(PaymentDB.recovered_amount)).scalar()
        or 0
    )
    
    total_blocked = (
    db.query(PaymentDB)
    .filter(
        PaymentDB.recovery_status == "blocked"
    )
    .count()
)

    total_recovered_count = (
    db.query(PaymentDB)
    .filter(PaymentDB.recovery_status == "recovered")
    .count()
)

    total_scheduled_count = (
    db.query(PaymentDB)
    .filter(PaymentDB.recovery_status == "scheduled")
    .count()
)

    recovery_rate = (
        (total_recovered / total_at_risk) * 100
        if total_at_risk > 0
        else 0
    )

    recent_payments = (
        db.query(PaymentDB)
        .order_by(PaymentDB.id.desc())
        .limit(10)
        .all()
    )

    db.close()

    return {
        "total_payments": total_payments,
        "revenue_at_risk": total_at_risk,
        "revenue_recovered": total_recovered,
        "recovery_rate": round(recovery_rate, 2),
        "payments_recovered": total_recovered_count,
        "payments_scheduled": total_scheduled_count,
        "payments_blocked": total_blocked,
        "recent_payments": [
            {
                "payment_id": payment.payment_id,
                "customer_id": payment.customer_id,
                "amount": payment.amount,
                "failure_reason": payment.failure_reason,
                "status": payment.recovery_status,
                "recovered_amount": payment.recovered_amount
            }
            for payment in recent_payments
        ]
    }


# Razorpay webhook
@app.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):

    # Get the raw body for signature verification
    body = await request.body()

    signature = request.headers.get(
        "X-Razorpay-Signature"
    )

    if not signature:
        raise HTTPException(
            status_code=400,
            detail="Missing Razorpay signature"
        )

    # Verify the webhook really came from Razorpay
    if not verify_webhook_signature(
        body,
        signature
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid Razorpay signature"
        )

    event = await request.json()

    event_name = event.get("event")

    # Razorpay gives every webhook event a unique ID
    event_id = request.headers.get(
        "x-razorpay-event-id"
    )

    if not event_id:
        raise HTTPException(
            status_code=400,
            detail="Missing Razorpay event ID"
        )

    db = SessionLocal()

    # Check whether we already processed this event
    existing_event = (
        db.query(WebhookEventDB)
        .filter(
            WebhookEventDB.event_id == event_id
        )
        .first()
    )

    if existing_event:
        db.close()

        print(
            f"Duplicate webhook ignored: {event_id}"
        )

        return {
            "status": "duplicate",
            "event": event_name,
            "event_id": event_id
        }

    print(
        f"Received Razorpay event: {event_name}"
    )

    # Handle payment failures
    if event_name == "payment.failed":

        payment_data = (
            event["payload"]["payment"]["entity"]
        )

        payment_id = payment_data["id"]

        amount = (
            payment_data["amount"] / 100
        )

        failure_reason = (
            payment_data.get("error_reason")
            or "unknown"
        )

        customer_id = (
            payment_data.get("email")
            or "razorpay_customer"
        )

        payment = Payment(
            payment_id=payment_id,
            customer_id=customer_id,
            amount=amount,
            status="failed",
            failure_reason=failure_reason
        )

        print(
            f"Processing payment: {payment_id}"
        )

        # Run RecoverAI
        result = recovery_graph.invoke({
            "payment": payment
        })

        recovery = result["recovery_action"]

        # Save payment result
        payment_db = PaymentDB(
            payment_id=payment.payment_id,
            customer_id=payment.customer_id,
            amount=payment.amount,
            status=payment.status,
            failure_reason=payment.failure_reason,
            retry_count=0,
            recovery_status=recovery["status"],
            recovered_amount=recovery.get(
                "recovered_amount",
                0
            )
        )

        db.add(payment_db)

    # Save the webhook event
    webhook_event = WebhookEventDB(
    event_id=event_id,
    event_type=event_name
)

    db.add(webhook_event)

        # Save the agent's decision
    audit_log = AuditLogDB(
    payment_id=payment.payment_id,
    action=recovery["action"],
    status=recovery["status"],
    reason=payment.failure_reason
)

    db.add(audit_log)

    db.commit()
    db.close()

    print(
            f"Recovery action: {recovery['action']}"
        )

    print(
            f"Recovery status: {recovery['status']}"
        )

    return {
            "status": "processed",
            "event": event_name,
            "event_id": event_id,
            "payment_id": payment_id,
            "analysis": result["analysis"],
            "ai_decision": result["ai_decision"],
            "safety_check": result["safety_check"],
            "recovery_action": recovery
        }

    # Other Razorpay events are acknowledged
    db.add(
        WebhookEventDB(
            event_id=event_id,
            event_type=event_name
        )
    )

    db.commit()
    db.close()

    return {
        "status": "received",
        "event": event_name,
        "event_id": event_id
    }
    
@app.get("/audit-logs")
def get_audit_logs():
    db = SessionLocal()

    logs = (
        db.query(AuditLogDB)
        .order_by(AuditLogDB.id.desc())
        .limit(10)
        .all()
    )

    db.close()

    return [
        {
            "payment_id": log.payment_id,
            "action": log.action,
            "status": log.status,
            "reason": log.reason
        }
        for log in logs
    ]