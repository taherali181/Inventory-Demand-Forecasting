# routers/products.py
import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Product, Supplier, User
from routers.auth import require_admin
from schemas import PaginatedResponse, ProductCreate, ProductRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


def _validate_supplier(db: Session, supplier_id: int) -> None:
    if supplier_id is not None and db.get(Supplier, supplier_id) is None:
        raise HTTPException(status_code=400, detail="default_supplier_id does not refer to an existing supplier.")


@router.get("", response_model=PaginatedResponse[ProductRead])
def list_products(
    include_inactive: bool = False,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if not include_inactive:
        query = query.filter(Product.is_active.is_(True))
    if search:
        # Case-insensitive substring match on name or SKU — simple LIKE,
        # not full-text search infrastructure, which this data scale
        # doesn't need.
        pattern = f"%{search}%"
        query = query.filter(Product.name.ilike(pattern) | Product.sku_code.ilike(pattern))
    total = query.count()
    items = query.order_by(Product.name).offset(skip).limit(limit).all()
    return PaginatedResponse(items=items, total=total)


_EXPORT_COLUMNS = [
    "id",
    "sku_code",
    "name",
    "category",
    "unit_of_measure",
    "unit_cost",
    "unit_price",
    "reorder_point",
    "safety_stock",
    "reorder_quantity",
    "is_active",
]


@router.get("/export")
def export_products(include_inactive: bool = False, db: Session = Depends(get_db)):
    """Streams every product as CSV (stdlib csv module — no new dependency,
    no matplotlib/reportlab-weight PDF rendering for what's fundamentally
    tabular data). Declared before GET /{product_id} so "export" isn't
    swallowed by that route and treated as an invalid product_id."""
    query = db.query(Product)
    if not include_inactive:
        query = query.filter(Product.is_active.is_(True))

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=_EXPORT_COLUMNS)
    writer.writeheader()
    for product in query.order_by(Product.name).all():
        writer.writerow({col: getattr(product, col) for col in _EXPORT_COLUMNS})
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products.csv"},
    )


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate, db: Session = Depends(get_db), _current_user: User = Depends(require_admin)
):
    if db.query(Product).filter(Product.sku_code == payload.sku_code).first():
        raise HTTPException(status_code=400, detail="A product with this SKU code already exists.")
    _validate_supplier(db, payload.default_supplier_id)

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")

    updates = payload.model_dump(exclude_unset=True)
    if "default_supplier_id" in updates:
        _validate_supplier(db, updates["default_supplier_id"])

    for field, value in updates.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_product(
    product_id: int, db: Session = Depends(get_db), _current_user: User = Depends(require_admin)
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    product.is_active = False
    db.commit()
