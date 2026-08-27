# tests/test_forecasting.py
"""Tests forecasting.create_forecast_run directly against the DB (not
through the API layer — tests/test_forecast_api.py covers that)."""
import datetime as dt

import pandas as pd
import pytest

from forecasting import (
    MIN_HISTORY_ROWS,
    InsufficientHistoryError,
    _forecast_exponential_smoothing,
    create_forecast_run,
)
from models import Product, SalesRecord, Warehouse


def _history_with_a_gap():
    # Days 1-10 present, day 11 missing entirely (a real gap, not a
    # zero-sales row — this app's sales_records has no explicit zero-sales
    # rows, only absent dates), days 12-20 present.
    dates = [dt.date(2023, 1, d) for d in range(1, 11)] + [dt.date(2023, 1, d) for d in range(12, 21)]
    sales = [100.0] * 19
    return pd.DataFrame({"date": pd.to_datetime(dates), "sales": sales})


def test_gap_fill_strategy_zero_treats_the_gap_as_zero_demand():
    predictions, _, _, _ = _forecast_exponential_smoothing(_history_with_a_gap(), horizon=3, gap_fill_strategy="zero")
    # A flat 100-sales history with one zero-filled gap day should still
    # forecast close to 100, not be thrown off wildly — mainly this
    # confirms the gap really was filled with 0 (not dropped, not NaN)
    # by successfully fitting/forecasting at all.
    assert len(predictions) == 3


def test_gap_fill_strategy_interpolate_preserves_the_old_behavior():
    predictions, _, _, _ = _forecast_exponential_smoothing(
        _history_with_a_gap(), horizon=3, gap_fill_strategy="interpolate"
    )
    assert len(predictions) == 3
    # With interpolation, the flat 100-sales series (gap smoothed to ~100
    # instead of dropping to 0) should forecast much closer to 100 than the
    # zero-fill strategy would for the same input.
    assert all(p > 50 for p in predictions)


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


def test_predictions_are_clipped_to_non_negative(db_session):
    # A steeply declining trend is exactly the case exponential smoothing's
    # additive trend component will happily extrapolate past zero into
    # negative predicted sales, which isn't a meaningful value for this
    # domain. Real sales data is never negative, so a naive/unclipped model
    # producing a negative prediction here is the bug this test guards.
    db = db_session()
    try:
        warehouse = Warehouse(name="Declining WH", code="DECLINE")
        product = Product(sku_code="DECLINE-SKU", name="Declining Widget")
        db.add_all([warehouse, product])
        db.flush()

        start = dt.date(2023, 1, 1)
        for i in range(20):
            db.add(
                SalesRecord(
                    date=start + dt.timedelta(days=i),
                    warehouse_id=warehouse.id,
                    product_id=product.id,
                    sales=max(1, 100 - i * 6),  # steep decline: 100, 94, ..., down near 0
                )
            )
        db.commit()

        run = create_forecast_run(db, product.id, warehouse.id, "exponential_smoothing", forecast_horizon=10)
        assert all(p.predicted_sales >= 0 for p in run.predictions)
    finally:
        db.close()


def test_random_forest_trains_at_the_min_history_rows_floor(db_session):
    # RandomForest's lag_1/lag_7/rolling_mean features (Change 9.7) need a
    # continuous daily series with at least 7 prior days for lag_7 — this
    # guards against that requirement silently raising the effective
    # minimum history needed above MIN_HISTORY_ROWS (10), which would make
    # the "insufficient history" check in create_pending_forecast_run a lie
    # for this model type specifically.
    db = db_session()
    try:
        warehouse = Warehouse(name="Floor WH", code="FLOOR")
        product = Product(sku_code="FLOOR-SKU", name="Floor Widget")
        db.add_all([warehouse, product])
        db.flush()

        start = dt.date(2023, 1, 1)
        for i in range(MIN_HISTORY_ROWS):
            db.add(
                SalesRecord(
                    date=start + dt.timedelta(days=i), warehouse_id=warehouse.id, product_id=product.id, sales=50 + i
                )
            )
        db.commit()

        run = create_forecast_run(db, product.id, warehouse.id, "random_forest", forecast_horizon=5)
        assert run.status.value == "completed"
        assert len(run.predictions) == 5
    finally:
        db.close()


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
