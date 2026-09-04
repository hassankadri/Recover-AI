from sqlalchemy import Column, Integer, String, Float
from database import Base


class PaymentDB(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String, unique=True, index=True)
    customer_id = Column(String, index=True)
    amount = Column(Float)
    status = Column(String)
    failure_reason = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    recovery_status = Column(String, default="pending")
    recovered_amount = Column(Float, default=0)


class WebhookEventDB(Base):
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)

    # Razorpay event ID.
    # unique=True prevents the same event from being stored twice.
    event_id = Column(String, unique=True, index=True)

    event_type = Column(String)
    
class AuditLogDB(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String, index=True)
    action = Column(String)
    status = Column(String)
    reason = Column(String)