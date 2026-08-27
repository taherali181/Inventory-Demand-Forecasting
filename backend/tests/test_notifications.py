# tests/test_notifications.py
"""Tests notifications.send_new_alert_notifications directly (mocking
smtplib.SMTP — no real network), and that routers/alerts.py's
recompute_alerts only schedules a send for genuinely newly-opened alerts,
never on a recompute that changes nothing (Phase 11, Change 11.7)."""
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

import notifications
from main import app
from models import Alert
from conftest import promote_to_admin

client = TestClient(app)


def _auth_headers(db_session, email="notify@example.com", password="testpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    promote_to_admin(db_session, email)
    return {"Authorization": f"Bearer {token}"}


def _setup_supplier_warehouse_product(headers, reorder_point=10):
    warehouse = client.post("/warehouses", json={"name": "W1", "code": "NOTIFY-W1"}, headers=headers).json()
    product = client.post(
        "/products",
        json={"sku_code": "NOTIFY-SKU", "name": "Widget", "reorder_point": reorder_point},
        headers=headers,
    ).json()
    return warehouse, product


def test_send_new_alert_notifications_is_a_noop_with_no_configured_recipients(db_session, monkeypatch):
    monkeypatch.setattr(notifications.settings, "alert_notification_emails", [])
    with patch("smtplib.SMTP") as mock_smtp:
        notifications.send_new_alert_notifications([1, 2, 3])
    mock_smtp.assert_not_called()


def test_send_new_alert_notifications_is_a_noop_with_no_alert_ids(db_session, monkeypatch):
    monkeypatch.setattr(notifications.settings, "alert_notification_emails", ["ops@example.com"])
    with patch("smtplib.SMTP") as mock_smtp:
        notifications.send_new_alert_notifications([])
    mock_smtp.assert_not_called()


def test_send_new_alert_notifications_sends_one_email_with_expected_recipients(db_session, monkeypatch):
    monkeypatch.setattr(notifications.settings, "alert_notification_emails", ["ops@example.com", "mgr@example.com"])

    db = db_session()
    try:
        alert = Alert(product_id=1, warehouse_id=1, alert_type="low_stock", threshold_value=10, current_value=2)
        db.add(alert)
        db.commit()
        alert_id = alert.id
    finally:
        db.close()

    mock_smtp_instance = MagicMock()
    with patch("smtplib.SMTP") as mock_smtp:
        mock_smtp.return_value.__enter__.return_value = mock_smtp_instance
        notifications.send_new_alert_notifications([alert_id])

    mock_smtp_instance.send_message.assert_called_once()
    sent_message = mock_smtp_instance.send_message.call_args[0][0]
    assert sent_message["To"] == "ops@example.com, mgr@example.com"
    assert "1 new low-stock alert" in sent_message["Subject"]


def test_send_new_alert_notifications_logs_but_does_not_raise_on_smtp_failure(db_session, monkeypatch, caplog):
    monkeypatch.setattr(notifications.settings, "alert_notification_emails", ["ops@example.com"])

    db = db_session()
    try:
        alert = Alert(product_id=1, warehouse_id=1, alert_type="low_stock", threshold_value=10, current_value=2)
        db.add(alert)
        db.commit()
        alert_id = alert.id
    finally:
        db.close()

    with patch("smtplib.SMTP", side_effect=OSError("connection refused")):
        notifications.send_new_alert_notifications([alert_id])  # must not raise


def test_recompute_schedules_a_notification_only_for_newly_created_alerts(db_session, monkeypatch):
    monkeypatch.setattr("notifications.settings.alert_notification_emails", ["ops@example.com"])
    mock_send = MagicMock()
    monkeypatch.setattr("routers.alerts.send_new_alert_notifications", mock_send)

    headers = _auth_headers(db_session)
    warehouse, product = _setup_supplier_warehouse_product(headers, reorder_point=10)

    # First recompute with no stock at all -> opens a new alert -> should
    # schedule exactly one notification call.
    client.post("/alerts/recompute", headers=headers)
    assert mock_send.call_count == 1
    scheduled_ids = mock_send.call_args[0][0]
    assert len(scheduled_ids) == 1

    # Second recompute with nothing changed -> the alert already exists,
    # nothing new opened -> must NOT schedule another notification.
    mock_send.reset_mock()
    client.post("/alerts/recompute", headers=headers)
    mock_send.assert_not_called()

    # Restock above the reorder point (resolves the alert), then let it
    # dip again -> a genuinely new alert opens -> notification fires again.
    client.post(
        "/stock/adjust",
        json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": 50},
        headers=headers,
    )
    client.post("/alerts/recompute", headers=headers)
    mock_send.reset_mock()
    client.post(
        "/stock/adjust",
        json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": -45},
        headers=headers,
    )
    client.post("/alerts/recompute", headers=headers)
    assert mock_send.call_count == 1


def test_recompute_does_not_schedule_when_no_recipients_configured(db_session, monkeypatch):
    monkeypatch.setattr("notifications.settings.alert_notification_emails", [])
    mock_send = MagicMock()
    monkeypatch.setattr("routers.alerts.send_new_alert_notifications", mock_send)

    headers = _auth_headers(db_session, "notify2@example.com")
    _setup_supplier_warehouse_product(headers, reorder_point=10)

    client.post("/alerts/recompute", headers=headers)
    mock_send.assert_not_called()
