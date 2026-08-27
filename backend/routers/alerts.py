# routers/alerts.py
import datetime as dt
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, AlertStatus, Product, StockLevel, User, Warehouse
from routers.auth import get_current_user
from schemas import AlertRead

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertRead])
def list_alerts(status_filter: Optional[AlertStatus] = None, db: Session = Depends(get_db)):
    query = db.query(Alert)
    if status_filter is not None:
        query = query.filter(Alert.status == status_filter)
    return query.order_by(Alert.created_at.desc()).all()


@router.post("/recompute", response_model=List[AlertRead])
def recompute_alerts(db: Session = Depends(get_db), _current_user: User = Depends(get_current_user)):
    """Compare every (active product, active warehouse) pair's available
    stock against the product's reorder_point: open a new low_stock alert
    where stock is at/under the threshold and none is already open, and
    auto-resolve open alerts whose stock has recovered.

    Deliberately iterates the full product x warehouse cross product rather
    than just existing stock_levels rows: a product that's never had a stock
    adjustment has *zero* stock everywhere, which is exactly the low-stock
    case a brand-new product with a reorder_point should surface — scanning
    only existing rows silently missed that. O(products x warehouses) is
    fine at this app's scale; revisit if the catalog grows large enough for
    that to matter.
    Returns every currently-open alert after recomputing.
    """
    stock_by_pair = {(sl.product_id, sl.warehouse_id): sl for sl in db.query(StockLevel).all()}
    products = db.query(Product).filter(Product.is_active.is_(True)).all()
    warehouses = db.query(Warehouse).filter(Warehouse.is_active.is_(True)).all()

    for product in products:
        for warehouse in warehouses:
            stock_level = stock_by_pair.get((product.id, warehouse.id))
            available = stock_level.quantity_available if stock_level else 0

            existing_open = (
                db.query(Alert)
                .filter(
                    Alert.product_id == product.id,
                    Alert.warehouse_id == warehouse.id,
                    Alert.alert_type == "low_stock",
                    Alert.status == AlertStatus.open,
                )
                .first()
            )

            if available <= product.reorder_point:
                if existing_open is None:
                    db.add(
                        Alert(
                            product_id=product.id,
                            warehouse_id=warehouse.id,
                            alert_type="low_stock",
                            threshold_value=product.reorder_point,
                            current_value=available,
                        )
                    )
                else:
                    existing_open.current_value = available
            elif existing_open is not None:
                existing_open.status = AlertStatus.resolved
                existing_open.resolved_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    return db.query(Alert).filter(Alert.status == AlertStatus.open).order_by(Alert.created_at.desc()).all()
