# tests/test_dashboard.py
"""Tests GET /dashboard/kpis (Phase 11, Change 11.1) against small
synthetic datasets with known expected values — not just a smoke test that
the endpoint returns 200."""
import datetime as dt

from fastapi.testclient import TestClient

from main import app
from models import ForecastPrediction, ForecastRun, ForecastStatus, Product, SalesRecord, StockLevel, Warehouse

client = TestClient(app)


def test_kpis_are_null_or_zero_against_an_empty_database(db_session):
    response = client.get("/dashboard/kpis")
    assert response.status_code == 200
    body = response.json()
    assert body["inventory_turnover"] is None
    assert body["stockout_rate"] is None
    assert body["forecast_mae"] is None
    assert body["forecast_mape"] is None
    assert body["forecast_sample_size"] == 0
    assert body["stock_level_count"] == 0


def test_inventory_turnover_and_stockout_rate_known_values(db_session):
    db = db_session()
    try:
        wh = Warehouse(name="WH", code="WH-DASH")
        p1 = Product(sku_code="DASH-1", name="P1")
        p2 = Product(sku_code="DASH-2", name="P2")
        p3 = Product(sku_code="DASH-3", name="P3")
        db.add_all([wh, p1, p2, p3])
        db.flush()

        # 3 stock_levels rows: two with stock, one stocked out (0 on hand).
        db.add_all(
            [
                StockLevel(product_id=p1.id, warehouse_id=wh.id, quantity_on_hand=50),
                StockLevel(product_id=p2.id, warehouse_id=wh.id, quantity_on_hand=50),
                StockLevel(product_id=p3.id, warehouse_id=wh.id, quantity_on_hand=0),
            ]
        )

        # Sales in the last 30 days: 100 total. Total on-hand: 100.
        # Expected inventory_turnover = 100 / 100 = 1.0.
        today = dt.date.today()
        db.add(SalesRecord(date=today, warehouse_id=wh.id, product_id=p1.id, sales=60))
        db.add(SalesRecord(date=today - dt.timedelta(days=5), warehouse_id=wh.id, product_id=p2.id, sales=40))
        # Outside the 30-day window — must NOT count toward the period total.
        db.add(SalesRecord(date=today - dt.timedelta(days=45), warehouse_id=wh.id, product_id=p1.id, sales=1000))
        db.commit()
    finally:
        db.close()

    response = client.get("/dashboard/kpis?days=30")
    assert response.status_code == 200
    body = response.json()
    assert body["total_sales_in_period"] == 100.0
    assert body["total_quantity_on_hand"] == 100
    assert body["inventory_turnover"] == 1.0
    assert body["stock_level_count"] == 3
    assert body["stockout_count"] == 1
    assert body["stockout_rate"] == 1 / 3


def test_forecast_accuracy_mae_and_mape_known_values(db_session):
    db = db_session()
    try:
        wh = Warehouse(name="WH2", code="WH-DASH-2")
        p = Product(sku_code="DASH-ACC", name="Accuracy Widget")
        db.add_all([wh, p])
        db.flush()

        past_date = dt.date.today() - dt.timedelta(days=2)
        run = ForecastRun(
            product_id=p.id,
            warehouse_id=wh.id,
            model_type="moving_average",
            forecast_horizon=1,
            status=ForecastStatus.completed,
        )
        db.add(run)
        db.flush()

        # Predicted 120, actual 100 -> absolute error 20, percentage error 0.2.
        db.add(ForecastPrediction(forecast_run_id=run.id, forecast_date=past_date, predicted_sales=120.0))
        db.add(SalesRecord(date=past_date, warehouse_id=wh.id, product_id=p.id, sales=100.0))

        # A second prediction with no matching actual (different date) —
        # must be excluded from the average entirely, not treated as an
        # error of some kind.
        db.add(
            ForecastPrediction(
                forecast_run_id=run.id, forecast_date=past_date - dt.timedelta(days=10), predicted_sales=999.0
            )
        )

        # A future-dated prediction — must be excluded (forecast_date > today).
        db.add(
            ForecastPrediction(
                forecast_run_id=run.id, forecast_date=dt.date.today() + dt.timedelta(days=5), predicted_sales=1.0
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/dashboard/kpis")
    assert response.status_code == 200
    body = response.json()
    assert body["forecast_sample_size"] == 1
    assert body["forecast_mae"] == 20.0
    assert body["forecast_mape"] == 20.0  # 0.2 * 100


def test_forecast_accuracy_excludes_zero_actual_from_mape_but_not_mae(db_session):
    db = db_session()
    try:
        wh = Warehouse(name="WH3", code="WH-DASH-3")
        p = Product(sku_code="DASH-ZERO", name="Zero-actual Widget")
        db.add_all([wh, p])
        db.flush()

        past_date = dt.date.today() - dt.timedelta(days=1)
        run = ForecastRun(
            product_id=p.id,
            warehouse_id=wh.id,
            model_type="moving_average",
            forecast_horizon=1,
            status=ForecastStatus.completed,
        )
        db.add(run)
        db.flush()
        db.add(ForecastPrediction(forecast_run_id=run.id, forecast_date=past_date, predicted_sales=10.0))
        db.add(SalesRecord(date=past_date, warehouse_id=wh.id, product_id=p.id, sales=0.0))
        db.commit()
    finally:
        db.close()

    response = client.get("/dashboard/kpis")
    body = response.json()
    assert body["forecast_sample_size"] == 1
    assert body["forecast_mae"] == 10.0
    assert body["forecast_mape"] is None  # would be a division by zero — excluded, not crashed
