# routers/dashboard.py
"""Aggregate KPIs computed from data this app already has — no new
tracking/storage introduced. See schemas.DashboardKpis for field-level
docs on what each number means and when it's None instead of 0 (a
genuinely undefined ratio, not a real zero).
"""
import datetime as dt

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import ForecastPrediction, ForecastRun, SalesRecord, StockLevel
from schemas import DashboardKpis

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=DashboardKpis)
def get_dashboard_kpis(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    cutoff = dt.date.today() - dt.timedelta(days=days)

    # --- Inventory turnover -------------------------------------------
    # A simplified proxy, not textbook COGS/average-inventory-value: this
    # app has no COGS tracking and no historical inventory snapshots (only
    # a current StockLevel snapshot), so "units sold in the period" over
    # "units currently on hand" is the honest approximation available from
    # the data that actually exists here.
    total_sales_in_period = db.query(func.sum(SalesRecord.sales)).filter(SalesRecord.date >= cutoff).scalar() or 0.0
    total_quantity_on_hand = db.query(func.sum(StockLevel.quantity_on_hand)).scalar() or 0
    inventory_turnover = (total_sales_in_period / total_quantity_on_hand) if total_quantity_on_hand > 0 else None

    # --- Stockout rate ---------------------------------------------------
    # Current-snapshot version (per IMPROVEMENT_PLAN.md Change 11.1):
    # fraction of existing stock_levels rows sitting at exactly 0 on hand.
    # Products/warehouse pairs with no stock_levels row at all (never
    # stocked) aren't counted either way — this measures "of what's been
    # stocked, how much has run out", not "of everything that could exist".
    stock_level_count = db.query(StockLevel).count()
    stockout_count = db.query(StockLevel).filter(StockLevel.quantity_on_hand == 0).count()
    stockout_rate = (stockout_count / stock_level_count) if stock_level_count > 0 else None

    # --- Forecast accuracy -------------------------------------------
    # Compares every past-dated ForecastPrediction (forecast_date <= today)
    # against the actual SalesRecord for the same (product, warehouse,
    # date), where one exists. Batched: one query for predictions+run
    # metadata, one for the matching actuals, joined in Python — not a
    # per-prediction query.
    today = dt.date.today()
    predictions = (
        db.query(ForecastPrediction, ForecastRun.product_id, ForecastRun.warehouse_id)
        .join(ForecastRun, ForecastPrediction.forecast_run_id == ForecastRun.id)
        .filter(ForecastPrediction.forecast_date <= today)
        .filter(ForecastRun.product_id.isnot(None), ForecastRun.warehouse_id.isnot(None))
        .all()
    )

    actuals_by_key = {
        (rec.date, rec.product_id, rec.warehouse_id): rec.sales
        for rec in db.query(SalesRecord).filter(
            SalesRecord.date <= today,
            SalesRecord.product_id.isnot(None),
            SalesRecord.warehouse_id.isnot(None),
        )
    }

    absolute_errors = []
    percentage_errors = []
    for prediction, product_id, warehouse_id in predictions:
        actual = actuals_by_key.get((prediction.forecast_date, product_id, warehouse_id))
        if actual is None:
            continue
        error = prediction.predicted_sales - actual
        absolute_errors.append(abs(error))
        if actual != 0:
            # MAPE is undefined (division by zero) for a zero-actual day —
            # excluded from the MAPE average, but still counted in MAE.
            percentage_errors.append(abs(error) / abs(actual))

    forecast_sample_size = len(absolute_errors)
    forecast_mae = (sum(absolute_errors) / forecast_sample_size) if forecast_sample_size > 0 else None
    forecast_mape = (
        (sum(percentage_errors) / len(percentage_errors) * 100) if len(percentage_errors) > 0 else None
    )

    return DashboardKpis(
        period_days=days,
        total_sales_in_period=total_sales_in_period,
        total_quantity_on_hand=total_quantity_on_hand,
        inventory_turnover=inventory_turnover,
        stockout_rate=stockout_rate,
        stockout_count=stockout_count,
        stock_level_count=stock_level_count,
        forecast_mae=forecast_mae,
        forecast_mape=forecast_mape,
        forecast_sample_size=forecast_sample_size,
    )
