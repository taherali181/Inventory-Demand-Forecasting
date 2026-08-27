# schemas.py
"""Pydantic request/response models.

Grows alongside the routers that use them — see models.py for the underlying
ORM schema this mirrors. Only auth-related schemas exist so far (Phase 1);
inventory CRUD schemas (Product, Warehouse, Supplier, StockLevel, ...) land
in Phase 3, purchase-order/alert schemas in Phase 4.
"""
import datetime as dt
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import UserRole

# bcrypt's own hard limit is 72 bytes; enforcing it here gives a clean 422
# instead of a 500 out of auth.hash_password().
PASSWORD_MAX_LENGTH = 72


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=PASSWORD_MAX_LENGTH)
    full_name: Optional[str] = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: dt.datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
