# schemas.py
"""Pydantic request/response models.

Grows alongside the routers that use them — see models.py for the underlying
ORM schema this mirrors. Purchase-order/alert schemas land in Phase 4.
"""
import datetime as dt
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import MovementType, UserRole

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


class WarehouseBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None


class WarehouseRead(WarehouseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: dt.datetime


class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: int = 7


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: Optional[int] = None
    is_active: Optional[bool] = None


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: dt.datetime


class ProductBase(BaseModel):
    sku_code: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: str = "unit"
    unit_cost: float = 0.0
    unit_price: float = 0.0
    default_supplier_id: Optional[int] = None
    reorder_point: int = 0
    safety_stock: int = 0
    reorder_quantity: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None
    unit_cost: Optional[float] = None
    unit_price: Optional[float] = None
    default_supplier_id: Optional[int] = None
    reorder_point: Optional[int] = None
    safety_stock: Optional[int] = None
    reorder_quantity: Optional[int] = None
    is_active: Optional[bool] = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: dt.datetime
    updated_at: dt.datetime


class StockLevelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    warehouse_id: int
    quantity_on_hand: int
    quantity_reserved: int
    quantity_available: int
    last_updated_at: dt.datetime


class StockAdjustment(BaseModel):
    product_id: int
    warehouse_id: int
    quantity_delta: int
    movement_type: MovementType = MovementType.adjustment
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
