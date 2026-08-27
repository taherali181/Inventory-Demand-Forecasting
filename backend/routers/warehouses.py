# routers/warehouses.py
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Warehouse
from routers.auth import require_admin
from schemas import PaginatedResponse, WarehouseCreate, WarehouseRead, WarehouseUpdate

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=PaginatedResponse[WarehouseRead])
def list_warehouses(
    include_inactive: bool = False,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Warehouse)
    if not include_inactive:
        query = query.filter(Warehouse.is_active.is_(True))
    if search:
        query = query.filter(Warehouse.name.ilike(f"%{search}%"))
    total = query.count()
    items = query.order_by(Warehouse.name).offset(skip).limit(limit).all()
    return PaginatedResponse(items=items, total=total)


@router.post("", response_model=WarehouseRead, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    payload: WarehouseCreate, db: Session = Depends(get_db), _current_user: User = Depends(require_admin)
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
    _current_user: User = Depends(require_admin),
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
    warehouse_id: int, db: Session = Depends(get_db), _current_user: User = Depends(require_admin)
):
    """Soft delete: sets is_active=False rather than removing the row, since
    stock_levels/sales_records/purchase_orders reference it by id."""
    warehouse = db.get(Warehouse, warehouse_id)
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
    warehouse.is_active = False
    db.commit()
