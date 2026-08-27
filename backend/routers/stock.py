# routers/stock.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Product, StockLevel, StockMovement, User, Warehouse
from routers.auth import get_current_user
from schemas import StockAdjustment, StockLevelRead

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("", response_model=List[StockLevelRead])
def list_stock_levels(
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(StockLevel)
    if product_id is not None:
        query = query.filter(StockLevel.product_id == product_id)
    if warehouse_id is not None:
        query = query.filter(StockLevel.warehouse_id == warehouse_id)
    return query.all()


@router.post("/adjust", response_model=StockLevelRead)
def adjust_stock(
    payload: StockAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply a signed quantity delta to a product's stock in a warehouse,
    creating the stock_levels row on first use, and always logging a
    stock_movements row — both writes commit together."""
    if db.get(Product, payload.product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    if db.get(Warehouse, payload.warehouse_id) is None:
        raise HTTPException(status_code=404, detail="Warehouse not found.")

    stock_level = (
        db.query(StockLevel)
        .filter(StockLevel.product_id == payload.product_id, StockLevel.warehouse_id == payload.warehouse_id)
        .first()
    )
    if stock_level is None:
        stock_level = StockLevel(
            product_id=payload.product_id, warehouse_id=payload.warehouse_id, quantity_on_hand=0
        )
        db.add(stock_level)

    new_quantity = stock_level.quantity_on_hand + payload.quantity_delta
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Adjustment would result in negative stock on hand.")

    stock_level.quantity_on_hand = new_quantity

    db.add(
        StockMovement(
            product_id=payload.product_id,
            warehouse_id=payload.warehouse_id,
            movement_type=payload.movement_type,
            quantity_delta=payload.quantity_delta,
            reference_type=payload.reference_type,
            reference_id=payload.reference_id,
            created_by=current_user.id,
        )
    )
    db.commit()
    db.refresh(stock_level)
    return stock_level
