from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    user_id: UUID
    transaction_type: str = Field(..., pattern="^(PURCHASE|REDEMPTION|ADJUSTMENT)$")
    purchase_amount: float = Field(0.00, ge=0.0)
    points_transacted: int
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
