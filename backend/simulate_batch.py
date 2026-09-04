from schemas import Payment
from analyzer import analyze_payment
from guardrails import check_action
from recovery import execute_recovery_action
from database import SessionLocal
from models import PaymentDB


def create_fake_payments(count=100):

    payments = []

    failure_reasons = [
        "insufficient_funds",
        "network_error",
        "card_declined"
    ]

    for i in range(1, count + 1):

        reason = failure_reasons[(i - 1) % len(failure_reasons)]

        # Every 10th payment is high-value
        if i % 10 == 0:
            amount = 15000
        else:
            amount = 1000 + (i * 25)

        payment = Payment(
            payment_id=f"batch_{i:03d}",
            customer_id=f"customer_{i:03d}",
            amount=amount,
            status="failed",
            failure_reason=reason
        )

        payments.append(payment)

    return payments


def run_batch():

    payments = create_fake_payments(100)

    db = SessionLocal()

    # Remove only previous batch simulation records
    db.query(PaymentDB).filter(
        PaymentDB.payment_id.like("batch_%")
    ).delete(
        synchronize_session=False
    )

    db.commit()

    total_at_risk = 0
    total_recovered = 0

    recovered_count = 0
    scheduled_count = 0
    customer_action_count = 0
    blocked_count = 0

    for payment in payments:

        # Analyze payment
        analysis = analyze_payment(payment)

        # Check safety rules
        safety_check = check_action(
            analysis["recommended_action"],
            retry_count=0,
            amount=payment.amount
        )

        # Execute only if allowed
        if safety_check["allowed"]:

            recovery = execute_recovery_action(
                analysis["recommended_action"],
                payment.amount
            )

        else:

            recovery = {
                "action": analysis["recommended_action"],
                "status": "blocked",
                "message": safety_check["reason"],
                "recovered_amount": 0
            }

        # Save payment to database
        payment_db = PaymentDB(
            payment_id=payment.payment_id,
            customer_id=payment.customer_id,
            amount=payment.amount,
            status=payment.status,
            failure_reason=payment.failure_reason,
            retry_count=0,
            recovery_status=recovery["status"],
            recovered_amount=recovery["recovered_amount"]
        )

        db.add(payment_db)

        total_at_risk += payment.amount
        total_recovered += recovery["recovered_amount"]

        if recovery["status"] == "recovered":
            recovered_count += 1

        elif recovery["status"] == "scheduled":
            scheduled_count += 1

        elif recovery["status"] == "customer_action_required":
            customer_action_count += 1

        elif recovery["status"] == "blocked":
            blocked_count += 1

    db.commit()
    db.close()

    recovery_rate = (
        total_recovered / total_at_risk * 100
        if total_at_risk > 0
        else 0
    )

    print("\n===== RecoverAI Batch Results =====")
    print("SIMULATED / SYNTHETIC DATA")
    print(f"Total failed payments: {len(payments)}")
    print(f"Revenue at risk: ₹{total_at_risk:.2f}")
    print(f"Revenue recovered: ₹{total_recovered:.2f}")
    print(f"Recovery rate: {recovery_rate:.2f}%")
    print(f"Payments recovered: {recovered_count}")
    print(f"Payments scheduled: {scheduled_count}")
    print(f"Customer action required: {customer_action_count}")
    print(f"Payments blocked: {blocked_count}")
    print("===================================")


if __name__ == "__main__":
    run_batch()