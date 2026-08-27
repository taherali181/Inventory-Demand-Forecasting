# routers/purchase_orders.py
import uuid
from contextlib import ExitStack

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import (
    MovementType,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    StockMovement,
    Supplier,
    User,
    UserRole,
    Warehouse,
)
from routers.auth import get_current_user
from schemas import (
    PaginatedResponse,
    PurchaseOrderCreate,
    PurchaseOrderRead,
    PurchaseOrderReceive,
    PurchaseOrderStatusUpdate,
)
from stock_ops import get_or_create_stock_level, stock_level_lock

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


PO_NUMBER_MAX_ATTEMPTS = 10


def _generate_po_number(db: Session) -> str:
    # 32 bits of entropy per attempt makes a real collision astronomically
    # unlikely at this app's scale, but an unbounded `while True` is still
    # a latent hang if something ever goes wrong (e.g. a bug that always
    # regenerates the same candidate). Bounded defensively, not because a
    # collision has ever actually been observed.
    for _ in range(PO_NUMBER_MAX_ATTEMPTS):
        candidate = f"PO-{uuid.uuid4().hex[:8].upper()}"
        if not db.query(PurchaseOrder).filter(PurchaseOrder.po_number == candidate).first():
            return candidate
    raise RuntimeError(f"Could not generate a unique PO number after {PO_NUMBER_MAX_ATTEMPTS} attempts.")


@router.get("", response_model=PaginatedResponse[PurchaseOrderRead])
def list_purchase_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    total = db.query(PurchaseOrder).count()
    # Page over PO ids first (no join), *then* eager-load items for just
    # that page — applying LIMIT/OFFSET directly to a query that also
    # joinedload()s a one-to-many collection is a known footgun: a PO with
    # multiple items can make the limit land mid-PO, so a "page of 50"
    # joined rows doesn't reliably mean 50 distinct purchase orders.
    page_ids = [
        po_id
        for (po_id,) in db.query(PurchaseOrder.id)
        .order_by(PurchaseOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    ]
    items = (
        db.query(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .filter(PurchaseOrder.id.in_(page_ids))
        .order_by(PurchaseOrder.created_at.desc())
        .unique()
        .all()
    )
    return PaginatedResponse(items=items, total=total)


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
    current_user: User = Depends(get_current_user),
):
    """Handles every status transition for a PO. Most transitions
    (submit/approve) are routine staff operations; cancellation is
    administrative — it can throw away an in-flight order a staff member
    doesn't own — so it's checked here rather than via a separate
    admin-only endpoint, since it's still fundamentally "the same action"
    (a status transition) as the rest of this function.
    """
    if payload.status == PurchaseOrderStatus.cancelled and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Cancelling a purchase order requires an admin account.")

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

    valid_product_ids = {item.product_id for item in po.items}
    unknown_product_ids = {receipt.product_id for receipt in payload.items} - valid_product_ids
    if unknown_product_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Product(s) {sorted(unknown_product_ids)} are not on this purchase order.",
        )

    # Lock every distinct product this receipt touches (all in po's one
    # warehouse) for the whole operation, not just each individual
    # increment — the write only actually lands at db.commit() below, so
    # the lock has to be held until then or a concurrent request could
    # still interleave (see stock_ops.py). Sorted by product_id so two
    # concurrent receipts touching overlapping product sets always acquire
    # their locks in the same order and can't deadlock against each other.
    product_ids = sorted({receipt.product_id for receipt in payload.items})
    with ExitStack() as locks:
        for product_id in product_ids:
            locks.enter_context(stock_level_lock(product_id, po.warehouse_id))

        for receipt in payload.items:
            # Re-query the line under lock (with_for_update, real on
            # Postgres) rather than trusting po.items as read before we
            # acquired the lock above — quantity_received is exactly the
            # same kind of read-then-write hazard as stock_levels.
            # populate_existing() is required, not optional: po.items above
            # already loaded this row into the session's identity map, so
            # without it SQLAlchemy would hand back that cached (stale)
            # Python object instead of the fresh values this query just
            # read from the DB — silently defeating the whole point of
            # re-querying. (Confirmed by test: without populate_existing(),
            # 20 concurrent 1-unit receipts landed only 3.)
            # .first() rather than .one(): duplicate-product line items on
            # one PO aren't rejected yet (Phase 9, Change 9.10), so this
            # stays crash-safe against that pre-existing gap in the
            # meantime, matching the old dict-based lookup's behavior of
            # silently preferring one match.
            line = (
                db.query(PurchaseOrderItem)
                .filter(
                    PurchaseOrderItem.purchase_order_id == po.id,
                    PurchaseOrderItem.product_id == receipt.product_id,
                )
                .populate_existing()
                .with_for_update()
                .first()
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

            # See stock_ops.get_or_create_stock_level for why this isn't
            # just a plain query + "create if missing".
            stock_level = get_or_create_stock_level(db, receipt.product_id, po.warehouse_id)
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
