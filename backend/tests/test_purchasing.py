# tests/test_purchasing.py
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _auth_headers(email="purchasing@example.com", password="testpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _setup_supplier_warehouse_product(headers, reorder_point=10):
    supplier = client.post("/suppliers", json={"name": "Acme Supply"}, headers=headers).json()
    warehouse = client.post("/warehouses", json={"name": "W1", "code": "W1"}, headers=headers).json()
    product = client.post(
        "/products",
        json={"sku_code": "SKU-PO-1", "name": "Widget", "reorder_point": reorder_point},
        headers=headers,
    ).json()
    return supplier, warehouse, product


def test_low_stock_alert_opens_and_resolves(db_session):
    headers = _auth_headers("alerts@example.com", "testpass123")
    _, warehouse, product = _setup_supplier_warehouse_product(headers, reorder_point=10)

    # No stock yet -> below reorder point -> recompute should open an alert.
    client.post(
        "/stock/adjust",
        json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": 5},
        headers=headers,
    )
    recompute_response = client.post("/alerts/recompute", headers=headers)
    assert recompute_response.status_code == 200
    alerts = recompute_response.json()
    assert any(a["product_id"] == product["id"] and a["status"] == "open" for a in alerts)

    # Restock above the reorder point -> recompute should auto-resolve it.
    client.post(
        "/stock/adjust",
        json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": 20},
        headers=headers,
    )
    recompute_again = client.post("/alerts/recompute", headers=headers).json()
    assert not any(a["product_id"] == product["id"] and a["status"] == "open" for a in recompute_again)

    resolved = client.get("/alerts?status_filter=resolved").json()
    assert any(a["product_id"] == product["id"] for a in resolved)


def test_low_stock_alert_opens_for_untouched_zero_stock_product(db_session):
    """Regression test: a product that's never had a stock adjustment has
    zero stock everywhere, which should still trip its reorder_point — not
    be silently skipped just because no stock_levels row exists yet."""
    headers = _auth_headers("zero-stock@example.com", "testpass123")
    _, warehouse, product = _setup_supplier_warehouse_product(headers, reorder_point=15)

    alerts = client.post("/alerts/recompute", headers=headers).json()
    assert any(
        a["product_id"] == product["id"] and a["warehouse_id"] == warehouse["id"] and a["current_value"] == 0
        for a in alerts
    )


def test_alerts_recompute_requires_auth(db_session):
    response = client.post("/alerts/recompute")
    assert response.status_code == 401


def test_purchase_order_full_lifecycle(db_session):
    headers = _auth_headers("po-lifecycle@example.com", "testpass123")
    supplier, warehouse, product = _setup_supplier_warehouse_product(headers)

    create_response = client.post(
        "/purchase-orders",
        json={
            "supplier_id": supplier["id"],
            "warehouse_id": warehouse["id"],
            "items": [{"product_id": product["id"], "quantity_ordered": 30, "unit_cost": 2.5}],
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    po = create_response.json()
    assert po["status"] == "draft"
    assert po["po_number"].startswith("PO-")

    # Can't receive a draft PO.
    early_receive = client.post(
        f"/purchase-orders/{po['id']}/receive",
        json={"items": [{"product_id": product["id"], "quantity": 10}]},
        headers=headers,
    )
    assert early_receive.status_code == 400

    # Invalid transition: draft -> received directly isn't allowed.
    bad_transition = client.put(
        f"/purchase-orders/{po['id']}/status", json={"status": "received"}, headers=headers
    )
    assert bad_transition.status_code == 400

    for target in ("submitted", "approved"):
        transition_response = client.put(
            f"/purchase-orders/{po['id']}/status", json={"status": target}, headers=headers
        )
        assert transition_response.status_code == 200
        assert transition_response.json()["status"] == target

    # Partial receipt.
    partial_receive = client.post(
        f"/purchase-orders/{po['id']}/receive",
        json={"items": [{"product_id": product["id"], "quantity": 10}]},
        headers=headers,
    )
    assert partial_receive.status_code == 200
    assert partial_receive.json()["status"] == "partially_received"
    assert partial_receive.json()["items"][0]["quantity_received"] == 10

    # Over-receiving the remainder is rejected.
    over_receive = client.post(
        f"/purchase-orders/{po['id']}/receive",
        json={"items": [{"product_id": product["id"], "quantity": 100}]},
        headers=headers,
    )
    assert over_receive.status_code == 400

    # Receive the rest -> fully received, stock reflects both receipts.
    final_receive = client.post(
        f"/purchase-orders/{po['id']}/receive",
        json={"items": [{"product_id": product["id"], "quantity": 20}]},
        headers=headers,
    )
    assert final_receive.status_code == 200
    assert final_receive.json()["status"] == "received"

    stock = client.get(f"/stock?product_id={product['id']}&warehouse_id={warehouse['id']}").json()
    assert stock[0]["quantity_on_hand"] == 30


def test_purchase_order_rejects_unknown_supplier(db_session):
    headers = _auth_headers("po-bad-supplier@example.com", "testpass123")
    _, warehouse, product = _setup_supplier_warehouse_product(headers)

    response = client.post(
        "/purchase-orders",
        json={
            "supplier_id": 999999,
            "warehouse_id": warehouse["id"],
            "items": [{"product_id": product["id"], "quantity_ordered": 5}],
        },
        headers=headers,
    )
    assert response.status_code == 400
