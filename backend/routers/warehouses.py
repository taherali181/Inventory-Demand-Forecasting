# routers/warehouses.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Warehouse
from routers.auth import get_current_user
from schemas import WarehouseCreate, WarehouseRead, WarehouseUpdate

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=List[WarehouseRead])
def list_warehouses(include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(Warehouse)
    if not include_inactive:
        query = query.filter(Warehouse.is_active.is_(True))
    return query.order_by(Warehouse.name).all()


@router.post("", response_model=WarehouseRead, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    payload: WarehouseCreate, db: Session = Depends(get_db), _current_user: User = Depends(get_current_user)
):
    if db.query(Warehouse).filter(Warehouse.code == payload.code).first():
        raise HTTPException(status_code=400, detail="A warehouse with this code already exists.")
    warehouse = Warehouse(**payload.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.get("/{warehouse_id}", response_model=WarehouseRead)
def get_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    warehouse = db.get(Warehouse, warehouse_id)
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
    return warehouse


@router.put("/{warehouse_id}", response_model=WarehouseRead)
def update_warehouse(
    warehouse_id: int,
    payload: WarehouseUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    warehouse = db.get(Warehouse, warehouse_id)
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(warehouse, field, value)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_warehouse(
    warehouse_id: int, db: Session = Depends(get_db), _current_user: User = Depends(get_current_user)
):
    """Soft delete: sets is_active=False rather than removing the row, since
    stock_levels/sales_records/purchase_orders reference it by id."""
    warehouse = db.get(Warehouse, warehouse_id)
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
    warehouse.is_active = False
    db.commit()
