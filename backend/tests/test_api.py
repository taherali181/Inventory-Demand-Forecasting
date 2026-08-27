# tests/test_api.py
import io

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _sample_csv_bytes(rows: int = 20) -> bytes:
    df = pd.DataFrame(
        {
            "date": pd.date_range("2023-01-01", periods=rows).strftime("%Y-%m-%d"),
            "store": ([1, 2] * (rows // 2 + 1))[:rows],
            "item": ([1, 2, 3, 4] * (rows // 4 + 1))[:rows],
            "sales": [100 + i for i in range(rows)],
        }
    )
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


@pytest.fixture(autouse=True)
def isolate_data_path(tmp_path, monkeypatch, db_session):
    """Point uploads at a throwaway CSV path + DB and reset shared app state
    between tests. Depends on db_session (from conftest.py) so every test in
    this file gets an isolated database too, since /upload now writes to it."""
    monkeypatch.setattr("data_processing.PROCESSED_DATA_PATH", tmp_path / "processed_data_temp.csv")
    app.state.data_path = None
    yield
    app.state.data_path = None


def test_forecast_before_upload_returns_404():
    response = client.get("/forecast")
    assert response.status_code == 404


def test_eda_before_upload_returns_404():
    response = client.get("/eda")
    assert response.status_code == 404


def test_upload_rejects_non_csv_extension():
    response = client.post("/upload", files={"file": ("data.txt", b"not a csv", "text/plain")})
    assert response.status_code == 400


def test_upload_rejects_missing_columns():
    bad_csv = b"date,sales\n2023-01-01,100\n"
    response = client.post("/upload", files={"file": ("bad.csv", bad_csv, "text/csv")})
    assert response.status_code == 400
    assert "missing required columns" in response.json()["detail"]


def test_upload_then_forecast_and_eda():
    csv_bytes = _sample_csv_bytes(rows=20)

    upload_response = client.post("/upload", files={"file": ("sales.csv", csv_bytes, "text/csv")})
    assert upload_response.status_code == 200
    body = upload_response.json()
    assert "eda" in body
    assert "summary_statistics" in body["eda"]

    forecast_response = client.get("/forecast?forecast_horizon=7")
    assert forecast_response.status_code == 200
    forecast_body = forecast_response.json()
    assert forecast_body["forecast_horizon"] == 7
    assert len(forecast_body["predictions"]) > 0

    eda_response = client.get("/eda")
    assert eda_response.status_code == 200
    assert "sales_trend_image" in eda_response.json()


def test_cors_headers_present_for_allowed_origin():
    response = client.options(
        "/upload",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
