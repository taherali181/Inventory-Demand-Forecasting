# routers/reorder.py
"""Connects two things this app already computes separately but never
linked: per-pair demand forecasts (forecasting.py) and each product's
reorder_point/reorder_quantity (models.Product). See IMPROVEMENT_PLAN.md
Change 11.2.
"""
import math

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import ForecastPrediction, ForecastRun, ForecastStatus, Product, StockLevel
from schemas import ReorderSuggestion

router = APIRouter(prefix="/reorder", tags=["reorder"])


@router.get("/suggestions", response_model=list[ReorderSuggestion])
def reorder_suggestions(db: Session = Depends(get_db)):
    """For every (product, warehouse) pair with both a stock_levels row and
    at least one completed forecast run, flags the pair as "at risk" when
    current available stock wouldn't cover the most recent run's total
    forecasted demand while staying above the product's reorder_point —
    i.e. `current_stock - forecasted_demand < reorder_point`. Only at-risk
    pairs are returned (not every forecasted pair).

    Pairs with no forecast run yet are simply absent here, not flagged —
    routers/alerts.py already covers the "no stock_levels row at all"
    zero-stock case; this endpoint is specifically about forecasted future
    demand, which requires a forecast run to exist in the first place.
    """
    # Most recent completed run per (product_id, warehouse_id): fetch all
    # completed runs newest-first and keep the first one seen per pair —
    # simpler than a SQL window function, and cheap at this app's scale
    # (one run row per training, not per prediction).
    latest_run_by_pair: dict = {}
    for run in (
        db.query(ForecastRun)
        .filter(
            ForecastRun.status == ForecastStatus.completed,
            ForecastRun.product_id.isnot(None),
            ForecastRun.warehouse_id.isnot(None),
        )
        .order_by(ForecastRun.trained_at.desc())
        .all()
    ):
        key = (run.product_id, run.warehouse_id)
        if key not in latest_run_by_pair:
            latest_run_by_pair[key] = run

    if not latest_run_by_pair:
        return []

    run_ids = [run.id for run in latest_run_by_pair.values()]
    demand_by_run_id = dict(
        db.query(ForecastPrediction.forecast_run_id, func.sum(ForecastPrediction.predicted_sales))
        .filter(ForecastPrediction.forecast_run_id.in_(run_ids))
        .group_by(ForecastPrediction.forecast_run_id)
        .all()
    )

    stock_by_pair = {
        (level.product_id, level.warehouse_id): level
        for level in db.query(StockLevel).filter(
            StockLevel.product_id.in_({p for p, _ in latest_run_by_pair}),
            StockLevel.warehouse_id.in_({w for _, w in latest_run_by_pair}),
        )
    }
    products_by_id = {p.id: p for p in db.query(Product).filter(Product.id.in_({p for p, _ in latest_run_by_pair}))}

    suggestions = []
    for (product_id, warehouse_id), run in latest_run_by_pair.items():
        stock_level = stock_by_pair.get((product_id, warehouse_id))
        product = products_by_id.get(product_id)
        if stock_level is None or product is None:
            continue

        forecasted_demand = demand_by_run_id.get(run.id, 0.0)
        current_stock = stock_level.quantity_available
        projected_stock = current_stock - forecasted_demand

        if projected_stock >= product.reorder_point:
            continue  # not at risk — stock covers forecasted demand with room to spare

        shortfall = math.ceil(product.reorder_point + forecasted_demand - current_stock)
        suggested_order_quantity = product.reorder_quantity if product.reorder_quantity > 0 else max(0, shortfall)

        suggestions.append(
            ReorderSuggestion(
                product_id=product_id,
                warehouse_id=warehouse_id,
                current_stock=current_stock,
                forecasted_demand=forecasted_demand,
                reorder_point=product.reorder_point,
                suggested_order_quantity=suggested_order_quantity,
                forecast_run_id=run.id,
            )
        )

    return suggestions
