# tests/test_forecasting.py
"""Tests forecasting.create_forecast_run directly against the DB (not
through the API layer — tests/test_forecast_api.py covers that)."""
import datetime as dt

import pytest

from forecasting import InsufficientHistoryError, create_forecast_run
from models import Product, SalesRecord, Warehouse


def _seed_history(db, days=30, warehouse_code="FC-WH", sku="FC-SKU"):
    warehouse = Warehouse(name="Forecast WH", code=warehouse_code)
    product = Product(sku_code=sku, name="Forecast Widget")
    db.add_all([warehouse, product])
    db.flush()

    start = dt.date(2023, 1, 1)
    for i in range(days):
        db.add(
            SalesRecord(
                date=start + dt.timedelta(days=i),
                warehouse_id=warehouse.id,
                product_id=product.id,
                sales=100 + (i % 7) * 5,  # mild weekly variation, no trend
            )
        )
    db.commit()
    return warehouse, product


def test_insufficient_history_raises(db_session):
    db = db_session()
    try:
        warehouse = Warehouse(name="Tiny WH", code="TINY")
        product = Product(sku_code="TINY-SKU", name="Tiny Widget")
        db.add_all([warehouse, product])
        db.flush()
        db.add(SalesRecord(date=dt.date(2023, 1, 1), warehouse_id=warehouse.id, product_id=product.id, sales=10))
        db.commit()

        with pytest.raises(InsufficientHistoryError):
            create_forecast_run(db, product.id, warehouse.id, "random_forest", 7)
    finally:
        db.close()


@pytest.mark.parametrize("model_type", ["moving_average", "random_forest", "exponential_smoothing"])
def test_forecast_predicts_genuine_future_dates(db_session, model_type):
    db = db_session()
    try:
        warehouse, product = _seed_history(db, days=30, warehouse_code=f"WH-{model_type}", sku=f"SKU-{model_type}")

        run = create_forecast_run(db, product.id, warehouse.id, model_type, forecast_horizon=5)

        assert run.status.value == "completed"
        assert run.model_type == model_type
        assert len(run.predictions) == 5

        last_history_date = dt.date(2023, 1, 30)
        predicted_dates = sorted(p.forecast_date for p in run.predictions)
        # Every predicted date must be strictly after the last historical date —
        # this is the actual bug being fixed: the old code returned predictions
        # on a historical held-out split, never on real future dates.
        assert all(d > last_history_date for d in predicted_dates)
        assert predicted_dates == [last_history_date + dt.timedelta(days=i) for i in range(1, 6)]
        assert all(p.predicted_sales >= 0 for p in run.predictions)
    finally:
        db.close()


def test_forecast_run_rejects_unknown_model_type(db_session):
    db = db_session()
    try:
        warehouse, product = _seed_history(db, warehouse_code="WH-badmodel", sku="SKU-badmodel")
        with pytest.raises(ValueError):
            create_forecast_run(db, product.id, warehouse.id, "prophet", 7)
    finally:
        db.close()


def test_get_forecast_run_does_not_retrain(db_session):
    """Persisted predictions should be stable on repeated reads (re-reading a
    run must not silently retrain and overwrite them)."""
    db = db_session()
    try:
        warehouse, product = _seed_history(db, warehouse_code="WH-stable", sku="SKU-stable")
        run = create_forecast_run(db, product.id, warehouse.id, "random_forest", forecast_horizon=3)
        first_predictions = [p.predicted_sales for p in run.predictions]

        reloaded = db.get(type(run), run.id)
        second_predictions = [p.predicted_sales for p in reloaded.predictions]

        assert first_predictions == second_predictions
    finally:
        db.close()
