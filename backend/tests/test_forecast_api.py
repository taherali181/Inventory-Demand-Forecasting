# tests/test_forecast_api.py
import datetime as dt

from fastapi.testclient import TestClient

from main import app
from models import Product, SalesRecord, Warehouse

client = TestClient(app)


def _seed_product_warehouse_with_history(db, days=15):
    warehouse = Warehouse(name="API WH", code="API-WH")
    product = Product(sku_code="API-SKU", name="API Widget")
    db.add_all([warehouse, product])
    db.flush()
    start = dt.date(2023, 1, 1)
    for i in range(days):
        db.add(
            SalesRecord(
                date=start + dt.timedelta(days=i), warehouse_id=warehouse.id, product_id=product.id, sales=50 + i
            )
        )
    db.commit()
    return warehouse, product


def test_forecast_requires_existing_product_and_warehouse(db_session):
    response = client.post(
        "/forecast", json={"product_id": 999999, "warehouse_id": 999999, "forecast_horizon": 5}
    )
    assert response.status_code == 404


def test_forecast_rejects_unknown_model_type_with_422(db_session):
    db = db_session()
    try:
        warehouse, product = _seed_product_warehouse_with_history(db)
        warehouse_id, product_id = warehouse.id, product.id
    finally:
        db.close()

    # model_type is a Literal in schemas.ForecastRequest now, so an unknown
    # value is rejected by Pydantic validation (422) before the request
    # handler runs at all — not the old runtime ValueError from
    # forecasting._validate_forecast_params (still exercised directly by
    # test_forecasting.py for callers that bypass the API).
    response = client.post(
        "/forecast",
        json={"product_id": product_id, "warehouse_id": warehouse_id, "model_type": "prophet", "forecast_horizon": 5},
    )
    assert response.status_code == 422


def test_forecast_rejects_insufficient_history(db_session):
    db = db_session()
    try:
        warehouse = Warehouse(name="Empty WH", code="EMPTY")
        product = Product(sku_code="EMPTY-SKU", name="Empty Widget")
        db.add_all([warehouse, product])
        db.commit()
        warehouse_id, product_id = warehouse.id, product.id
    finally:
        db.close()

    response = client.post(
        "/forecast", json={"product_id": product_id, "warehouse_id": warehouse_id, "forecast_horizon": 5}
    )
    assert response.status_code == 400


def test_forecast_create_and_reread_without_retraining(db_session):
    db = db_session()
    try:
        warehouse, product = _seed_product_warehouse_with_history(db)
        warehouse_id, product_id = warehouse.id, product.id
    finally:
        db.close()

    create_response = client.post(
        "/forecast",
        json={
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "model_type": "random_forest",
            "forecast_horizon": 4,
        },
    )
    # 202, not 201/completed-with-predictions: training now runs as a
    # BackgroundTasks callback (see forecasting.run_forecast_training_in_
    # background), so the response reflects the run's state at the moment
    # the endpoint returned — before training has necessarily happened.
    assert create_response.status_code == 202
    body = create_response.json()
    assert body["status"] == "pending"
    assert body["predictions"] == []
    run_id = body["id"]

    # FastAPI's TestClient runs BackgroundTasks synchronously as part of
    # the same request/response cycle, so by the time client.post() above
    # returned, training had already actually finished — this GET is a
    # genuine re-read of the persisted result, not a wait/poll loop.
    reread_response = client.get(f"/forecast/{run_id}")
    assert reread_response.status_code == 200
    reread_body = reread_response.json()
    assert reread_body["status"] == "completed"
    assert len(reread_body["predictions"]) == 4

    second_reread = client.get(f"/forecast/{run_id}")
    assert second_reread.json()["predictions"] == reread_body["predictions"]

    list_response = client.get(f"/forecast?product_id={product_id}&warehouse_id={warehouse_id}")
    assert list_response.status_code == 200
    assert any(run["id"] == run_id for run in list_response.json()["items"])


def test_forecast_missing_run_returns_404(db_session):
    assert client.get("/forecast/999999").status_code == 404


def test_forecast_compare_returns_the_most_recent_run_per_model_type(db_session):
    db = db_session()
    try:
        warehouse, product = _seed_product_warehouse_with_history(db)
        warehouse_id, product_id = warehouse.id, product.id
    finally:
        db.close()

    # No runs yet — compare returns an empty list, not a 404.
    empty = client.get(f"/forecast/compare?product_id={product_id}&warehouse_id={warehouse_id}")
    assert empty.status_code == 200
    assert empty.json() == []

    # Train moving_average twice — compare should return only the more
    # recent of the two runs for that model type, not both.
    first_ma = client.post(
        "/forecast",
        json={"product_id": product_id, "warehouse_id": warehouse_id, "model_type": "moving_average"},
    ).json()
    second_ma = client.post(
        "/forecast",
        json={"product_id": product_id, "warehouse_id": warehouse_id, "model_type": "moving_average"},
    ).json()
    client.post(
        "/forecast",
        json={"product_id": product_id, "warehouse_id": warehouse_id, "model_type": "random_forest"},
    )

    compare = client.get(f"/forecast/compare?product_id={product_id}&warehouse_id={warehouse_id}")
    assert compare.status_code == 200
    body = compare.json()
    model_types = {run["model_type"] for run in body}
    assert model_types == {"moving_average", "random_forest"}  # exponential_smoothing never trained — omitted

    ma_run = next(run for run in body if run["model_type"] == "moving_average")
    assert ma_run["id"] == second_ma["id"]
    assert ma_run["id"] != first_ma["id"]


def test_forecast_compare_route_is_not_shadowed_by_run_id_route(db_session):
    # "/forecast/compare" must not be captured by GET /forecast/{run_id}
    # (which would try to parse "compare" as an int and 404/422) —
    # regression guard, same class of bug as the /products/export and
    # /purchase-orders/export route-ordering fixes.
    response = client.get("/forecast/compare?product_id=1&warehouse_id=1")
    assert response.status_code == 200
