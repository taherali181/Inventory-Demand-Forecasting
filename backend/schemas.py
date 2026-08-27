# schemas.py
"""Pydantic request/response models.

Grows alongside the routers that use them — see models.py for the underlying
ORM schema this mirrors.
"""
import datetime as dt
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import AlertStatus, ForecastStatus, MovementType, PurchaseOrderStatus, UserRole

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
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenOnly(BaseModel):
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


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    warehouse_id: int
    alert_type: str
    threshold_value: float
    current_value: float
    status: AlertStatus
    created_at: dt.datetime
    resolved_at: Optional[dt.datetime]


class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    quantity_ordered: int = Field(gt=0)
    unit_cost: float = 0.0


class PurchaseOrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity_ordered: int
    quantity_received: int
    unit_cost: float


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    warehouse_id: int
    order_date: Optional[dt.date] = None
    expected_delivery_date: Optional[dt.date] = None
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    po_number: str
    supplier_id: int
    warehouse_id: int
    status: PurchaseOrderStatus
    order_date: Optional[dt.date]
    expected_delivery_date: Optional[dt.date]
    created_at: dt.datetime
    updated_at: dt.datetime
    items: List[PurchaseOrderItemRead]


class PurchaseOrderStatusUpdate(BaseModel):
    status: PurchaseOrderStatus


class PurchaseOrderReceiveItem(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class PurchaseOrderReceive(BaseModel):
    items: List[PurchaseOrderReceiveItem]


class ForecastRequest(BaseModel):
    product_id: int
    warehouse_id: int
    model_type: str = "random_forest"
    forecast_horizon: int = Field(default=7, gt=0, le=365)


class ForecastPredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    forecast_date: dt.date
    predicted_sales: float


class ForecastRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: Optional[int]
    warehouse_id: Optional[int]
    model_type: str
    forecast_horizon: int
    trained_at: dt.datetime
    rmse: Optional[float]
    mae: Optional[float]
    status: ForecastStatus
    predictions: List[ForecastPredictionRead]
