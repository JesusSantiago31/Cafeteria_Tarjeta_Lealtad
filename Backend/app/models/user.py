from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100, description="Customer's first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Customer's last name")
    email: EmailStr = Field(..., description="Unique customer email address")
    phone: Optional[str] = Field(None, max_length=20, description="Customer's phone number")


class UserCreate(UserBase):
    loyalty_code: Optional[str] = Field(
        None,
        max_length=50,
        description="Unique loyalty/QR code. If omitted, will be auto-generated."
    )


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class UserPointsUpdate(BaseModel):
    points_transacted: int = Field(..., description="Number of points added (positive) or redeemed/deducted (negative)")
    transaction_type: str = Field(..., pattern="^(PURCHASE|REDEMPTION|ADJUSTMENT)$", description="Type of transaction")
    purchase_amount: Optional[float] = Field(0.00, ge=0.0, description="Purchase amount in monetary units")
    description: Optional[str] = Field(None, description="Optional description or store notes")


class UserResponse(UserBase):
    id: UUID
    loyalty_code: str
    current_points: int = 0
    total_points_earned: int = 0
    total_points_spent: int = 0
    total_purchases_count: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
