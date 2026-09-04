from pydantic import BaseModel


class Payment(BaseModel):
    payment_id: str
    customer_id: str
    amount: float
    status: str
    failure_reason: str | None = None