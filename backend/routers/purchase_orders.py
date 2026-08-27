# routers/purchase_orders.py
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import (
    MovementType,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    StockLevel,
    StockMovement,
    Supplier,
    User,
    Warehouse,
)
from routers.auth import get_current_user
from schemas import (
    PurchaseOrderCreate,
    PurchaseOrderRead,
    PurchaseOrderReceive,
    PurchaseOrderStatusUpdate,
)

router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])

# Allowed next-statuses from each status; anything not listed (including from
# received/cancelled) is a terminal state with no further transitions.
_ALLOWED_TRANSITIONS = {
    PurchaseOrderStatus.draft: {PurchaseOrderStatus.submitted, PurchaseOrderStatus.cancelled},
    PurchaseOrderStatus.submitted: {PurchaseOrderStatus.approved, PurchaseOrderStatus.cancelled},
    PurchaseOrderStatus.approved: {
        PurchaseOrderStatus.partially_received,
        PurchaseOrderStatus.received,
        PurchaseOrderStatus.cancelled,
    },
    PurchaseOrderStatus.partially_received: {PurchaseOrderStatus.received, PurchaseOrderStatus.cancelled},
}


def _generate_po_number(db: Session) -> str:
    while True:
        candidate = f"PO-{uuid.uuid4().hex[:8].upper()}"
        if not db.query(PurchaseOrder).filter(PurchaseOrder.po_number == candidate).first():
            return candidate


@router.get("", response_model=List[PurchaseOrderRead])
def list_purchase_orders(db: Session = Depends(get_db)):
    return (
        db.query(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .order_by(PurchaseOrder.created_at.desc())
        .unique()
        .all()
    )


@router.post("", response_model=PurchaseOrderRead, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if db.get(Supplier, payload.supplier_id) is None:
        raise HTTPException(status_code=400, detail="supplier_id does not refer to an existing supplier.")
    if db.get(Warehouse, payload.warehouse_id) is None:
        raise HTTPException(status_code=400, detail="warehouse_id does not refer to an existing warehouse.")
    if not payload.items:
        raise HTTPException(status_code=400, detail="A purchase order needs at least one line item.")
    for item in payload.items:
        if db.get(Product, item.product_id) is None:
            raise HTTPException(status_code=400, detail=f"product_id {item.product_id} does not exist.")

    po = PurchaseOrder(
        po_number=_generate_po_number(db),
        supplier_id=payload.supplier_id,
        warehouse_id=payload.warehouse_id,
        order_date=payload.order_date,
        expected_delivery_date=payload.expected_delivery_date,
        created_by=current_user.id,
        items=[
            PurchaseOrderItem(
                product_id=item.product_id, quantity_ordered=item.quantity_ordered, unit_cost=item.unit_cost
            )
            for item in payload.items
        ],
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


@router.get("/{po_id}", response_model=PurchaseOrderRead)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.get(PurchaseOrder, po_id)
    if po is None:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return po


@router.put("/{po_id}/status", response_model=PurchaseOrderRead)
def update_purchase_order_status(
    po_id: int,
    payload: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    po = db.get(PurchaseOrder, po_id)
    if po is None:
        raise HTTPException(status_code=404, detail="Purchase order not found.")

    allowed = _ALLOWED_TRANSITIONS.get(po.status, set())
    if payload.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition purchase order from {po.status.value} to {payload.status.value}.",
        )

    po.status = payload.status
    db.commit()
    db.refresh(po)
    return po


@router.post("/{po_id}/receive", response_model=PurchaseOrderRead)
def receive_purchase_order(
    po_id: int,
    payload: PurchaseOrderReceive,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a (possibly partial) delivery: increments stock on hand and
    quantity_received per line item, logs a stock_movements 'receipt' row per
    line, and advances the PO's status to partially_received or received."""
    po = db.get(PurchaseOrder, po_id)
    if po is None:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    if po.status not in (PurchaseOrderStatus.approved, PurchaseOrderStatus.partially_received):
        raise HTTPException(
            status_code=400,
            detail=f"Purchase order must be approved before it can be received (currently {po.status.value}).",
        )

    items_by_product = {item.product_id: item for item in po.items}

    for receipt in payload.items:
        line = items_by_product.get(receipt.product_id)
        if line is None:
            raise HTTPException(
                status_code=400, detail=f"Product {receipt.product_id} is not on this purchase order."
            )
        remaining = line.quantity_ordered - line.quantity_received
        if receipt.quantity > remaining:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot receive {receipt.quantity} of product {receipt.product_id}; "
                    f"only {remaining} remain on order."
                ),
            )

        line.quantity_received += receipt.quantity

        stock_level = (
            db.query(StockLevel)
            .filter(StockLevel.product_id == receipt.product_id, StockLevel.warehouse_id == po.warehouse_id)
            .first()
        )
        if stock_level is None:
            stock_level = StockLevel(product_id=receipt.product_id, warehouse_id=po.warehouse_id, quantity_on_hand=0)
            db.add(stock_level)
        stock_level.quantity_on_hand += receipt.quantity

        db.add(
            StockMovement(
                product_id=receipt.product_id,
                warehouse_id=po.warehouse_id,
                movement_type=MovementType.receipt,
                quantity_delta=receipt.quantity,
                reference_type="purchase_order",
                reference_id=po.id,
                created_by=current_user.id,
            )
        )

    db.flush()
    po.status = (
        PurchaseOrderStatus.received
        if all(item.quantity_received >= item.quantity_ordered for item in po.items)
        else PurchaseOrderStatus.partially_received
    )

    db.commit()
    db.refresh(po)
    return po
