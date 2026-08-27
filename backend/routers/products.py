# routers/products.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Product, Supplier, User
from routers.auth import require_admin
from schemas import ProductCreate, ProductRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


def _validate_supplier(db: Session, supplier_id: int) -> None:
    if supplier_id is not None and db.get(Supplier, supplier_id) is None:
        raise HTTPException(status_code=400, detail="default_supplier_id does not refer to an existing supplier.")


@router.get("", response_model=List[ProductRead])
def list_products(include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(Product)
    if not include_inactive:
        query = query.filter(Product.is_active.is_(True))
    return query.order_by(Product.name).all()


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
