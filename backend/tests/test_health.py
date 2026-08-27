# tests/test_health.py
import logging

from fastapi.testclient import TestClient

from logging_config import JsonFormatter
from main import app

client = TestClient(app)


def test_health_reports_ok_against_the_test_db(db_session):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}


def test_health_reports_degraded_when_the_db_is_unreachable(db_session, monkeypatch):
    def _broken_execute(*args, **kwargs):
        raise RuntimeError("connection refused")

    # Patch the Session.execute method the /health handler calls — simpler
    # and more targeted than trying to actually sever a SQLite connection.
    import sqlalchemy.orm

    monkeypatch.setattr(sqlalchemy.orm.Session, "execute", _broken_execute)

    response = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "db": "unreachable"}


def test_metrics_endpoint_returns_prometheus_exposition_format(db_session):
    # Hit a real endpoint first so the instrumentator has at least one
    # request recorded.
    client.get("/health")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert "http_requests_total" in response.text


def test_json_formatter_produces_valid_json_with_expected_fields():
    import json

    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="test.logger",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="something happened: %s",
        args=("detail",),
        exc_info=None,
    )
    output = json.loads(formatter.format(record))
    assert output["level"] == "INFO"
    assert output["logger"] == "test.logger"
    assert output["message"] == "something happened: detail"
    assert "timestamp" in output
    assert "exception" not in output
