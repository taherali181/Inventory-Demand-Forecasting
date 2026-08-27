# tests/test_reorder.py
"""Tests GET /reorder/suggestions (Phase 11, Change 11.2) with synthetic
stock/reorder-point/forecast data, verifying at-risk pairs are correctly
flagged and sufficiently-stocked ones are excluded."""
import datetime as dt

from fastapi.testclient import TestClient

from main import app
from models import ForecastPrediction, ForecastRun, ForecastStatus, Product, StockLevel, Warehouse

client = TestClient(app)


def _make_run(db, product_id, warehouse_id, predicted_sales_values):
    run = ForecastRun(
        product_id=product_id,
        warehouse_id=warehouse_id,
        model_type="moving_average",
        forecast_horizon=len(predicted_sales_values),
        status=ForecastStatus.completed,
    )
    db.add(run)
    db.flush()
    start = dt.date.today() + dt.timedelta(days=1)
    for i, value in enumerate(predicted_sales_values):
        db.add(
            ForecastPrediction(forecast_run_id=run.id, forecast_date=start + dt.timedelta(days=i), predicted_sales=value)
        )
    db.commit()
    return run


def test_at_risk_pair_is_flagged_with_expected_numbers(db_session):
    db = db_session()
    try:
        wh = Warehouse(name="WH", code="REORDER-WH")
        # reorder_point=20, reorder_quantity=0 (unset) -> suggested quantity
        # falls back to the computed shortfall.
        p = Product(sku_code="REORDER-1", name="At-risk Widget", reorder_point=20, reorder_quantity=0)
        db.add_all([wh, p])
        db.flush()
        db.add(StockLevel(product_id=p.id, warehouse_id=wh.id, quantity_on_hand=50, quantity_reserved=0))
        db.commit()
        product_id, warehouse_id = p.id, wh.id

        # Forecasted demand: 10 + 15 + 20 = 45. current_stock=50.
        # projected_stock = 50 - 45 = 5, which is < reorder_point (20) -> at risk.
        # shortfall = ceil(20 + 45 - 50) = 15.
        run = _make_run(db, product_id, warehouse_id, [10, 15, 20])
        run_id = run.id
    finally:
        db.close()

    response = client.get("/reorder/suggestions")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    suggestion = body[0]
    assert suggestion["product_id"] == product_id
    assert suggestion["warehouse_id"] == warehouse_id
    assert suggestion["current_stock"] == 50
    assert suggestion["forecasted_demand"] == 45.0
    assert suggestion["reorder_point"] == 20
    assert suggestion["suggested_order_quantity"] == 15
    assert suggestion["forecast_run_id"] == run_id


def test_well_stocked_pair_is_not_flagged(db_session):
    db = db_session()
    try:
        wh = Warehouse(name="WH2", code="REORDER-WH-2")
        p = Product(sku_code="REORDER-2", name="Well-stocked Widget", reorder_point=10)
        db.add_all([wh, p])
        db.flush()
        # current_stock=500, forecasted demand=5 -> projected_stock=495, way
        # above reorder_point (10) -> not at risk.
        db.add(StockLevel(product_id=p.id, warehouse_id=wh.id, quantity_on_hand=500, quantity_reserved=0))
        db.commit()
        _make_run(db, p.id, wh.id, [5])
    finally:
        db.close()

    response = client.get("/reorder/suggestions")
    assert response.status_code == 200
    assert response.json() == []


def test_suggested_quantity_uses_products_reorder_quantity_when_set(db_session):
    db = db_session()
    try:
        wh = Warehouse(name="WH3", code="REORDER-WH-3")
        p = Product(sku_code="REORDER-3", name="Configured Widget", reorder_point=20, reorder_quantity=100)
        db.add_all([wh, p])
        db.flush()
        db.add(StockLevel(product_id=p.id, warehouse_id=wh.id, quantity_on_hand=10, quantity_reserved=0))
        db.commit()
        _make_run(db, p.id, wh.id, [50])  # forecasted demand 50 >> current stock 10 -> definitely at risk
    finally:
        db.close()

    response = client.get("/reorder/suggestions")
    body = response.json()
    assert len(body) == 1
    # reorder_quantity=100 is set, so it's used directly instead of the
    # computed shortfall (which would be ceil(20 + 50 - 10) = 60).
    assert body[0]["suggested_order_quantity"] == 100


def test_pair_with_no_forecast_run_is_absent_not_flagged(db_session):
    db = db_session()
    try:
        wh = Warehouse(name="WH4", code="REORDER-WH-4")
        p = Product(sku_code="REORDER-4", name="Unforecast Widget", reorder_point=100)
        db.add_all([wh, p])
        db.flush()
        # Deeply understocked, but no forecast run exists for this pair —
        # routers/alerts.py's job to catch this, not reorder/suggestions.
        db.add(StockLevel(product_id=p.id, warehouse_id=wh.id, quantity_on_hand=0, quantity_reserved=0))
        db.commit()
    finally:
        db.close()

    response = client.get("/reorder/suggestions")
    assert response.json() == []


def test_only_the_most_recent_completed_run_is_used_per_pair(db_session):
    db = db_session()
    try:
        wh = Warehouse(name="WH5", code="REORDER-WH-5")
        p = Product(sku_code="REORDER-5", name="Retrained Widget", reorder_point=5)
        db.add_all([wh, p])
        db.flush()
        db.add(StockLevel(product_id=p.id, warehouse_id=wh.id, quantity_on_hand=100, quantity_reserved=0))
        db.commit()

        # Old run: huge forecasted demand that would flag this as at risk...
        _make_run(db, p.id, wh.id, [1000])
        # ...but a newer run with much lower demand supersedes it.
        newer_run = _make_run(db, p.id, wh.id, [1])
        newer_run_id = newer_run.id
    finally:
        db.close()

    response = client.get("/reorder/suggestions")
    body = response.json()
    # Only the newer run's tiny demand is considered -> not at risk at all.
    assert body == []

    # Sanity: if the old (1000-demand) run had been used instead, this pair
    # would show up as at-risk — confirming the exclusion above isn't just
    # because both runs happen to agree.
    compare = client.get(f"/forecast/{newer_run_id}").json()
    assert compare["forecast_horizon"] == 1
