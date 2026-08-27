# tests/test_purchasing.py
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager

from fastapi.testclient import TestClient
from sqlalchemy import event

from main import app
from conftest import promote_to_admin

client = TestClient(app)


@contextmanager
def _count_queries_on_engine(engine):
    count = 0

    def _increment(*_args, **_kwargs):
        nonlocal count
        count += 1

    event.listen(engine, "before_cursor_execute", _increment)
    try:
        yield lambda: count
    finally:
        event.remove(engine, "before_cursor_execute", _increment)


def _auth_headers(db_session, email="purchasing@example.com", password="testpass123"):
    """Registers, logs in, and promotes to admin — every test here creates
    suppliers/warehouses/products via _setup_supplier_warehouse_product,
    which require_admin now gates (see Phase 7 RBAC). PO creation/receiving/
    alert recompute are all staff-level too, so an admin token still works
    for those (admin is a superset of staff, not a separate track)."""
    client.post("/auth/register", json={"email": email, "password": password})
    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    promote_to_admin(db_session, email)
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
    headers = _auth_headers(db_session, "alerts@example.com", "testpass123")
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

    resolved = client.get("/alerts?status_filter=resolved").json()["items"]
    assert any(a["product_id"] == product["id"] for a in resolved)


def test_low_stock_alert_opens_for_untouched_zero_stock_product(db_session):
    """Regression test: a product that's never had a stock adjustment has
    zero stock everywhere, which should still trip its reorder_point — not
    be silently skipped just because no stock_levels row exists yet."""
    headers = _auth_headers(db_session, "zero-stock@example.com", "testpass123")
    _, warehouse, product = _setup_supplier_warehouse_product(headers, reorder_point=15)

    alerts = client.post("/alerts/recompute", headers=headers).json()
    assert any(
        a["product_id"] == product["id"] and a["warehouse_id"] == warehouse["id"] and a["current_value"] == 0
        for a in alerts
    )


def test_alerts_recompute_requires_auth(db_session):
    response = client.post("/alerts/recompute")
    assert response.status_code == 401


def test_recompute_alerts_query_count_does_not_scale_with_product_count(db_session):
    """Regression test for the N+1 fixed in Phase 8 (Change 8.6):
    recompute_alerts used to run one Alert existence *SELECT* per product x
    warehouse pair, on top of any INSERT/UPDATE actually needed. INSERTs/
    UPDATEs for alerts that genuinely change state are normal ORM behavior
    and DO legitimately scale with how many alerts change (that's not the
    bug) — so this test uses a "nothing changes" scenario (every product
    well-stocked, no alert ever opens) to isolate just the fixed part: with
    no per-pair reads OR writes needed, query count should stay flat
    (a handful of fixed bulk queries) regardless of product count, not grow
    with it. The product x warehouse cross-product Python-level iteration
    itself is intentionally unchanged (see the router's docstring)."""
    headers = _auth_headers(db_session, "alerts-n1@example.com", "testpass123")
    warehouse = client.post("/warehouses", json={"name": "W", "code": "N1-W"}, headers=headers).json()

    probe_db = db_session()
    engine = probe_db.get_bind()
    probe_db.close()

    def _make_well_stocked_products(n, prefix):
        for i in range(n):
            product = client.post(
                "/products",
                json={"sku_code": f"{prefix}-{i}", "name": f"Widget {i}", "reorder_point": 0},
                headers=headers,
            ).json()
            client.post(
                "/stock/adjust",
                json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": 100},
                headers=headers,
            )

    _make_well_stocked_products(3, "N1A")
    with _count_queries_on_engine(engine) as small_count:
        recompute_response = client.post("/alerts/recompute", headers=headers)
    assert recompute_response.json() == []  # nothing below its reorder point
    small_queries = small_count()

    _make_well_stocked_products(30, "N1B")
    with _count_queries_on_engine(engine) as large_count:
        recompute_response = client.post("/alerts/recompute", headers=headers)
    assert recompute_response.json() == []
    large_queries = large_count()

    # ~11x the products (33 vs 3), with nothing to insert/update either
    # time, should mean roughly the SAME small query count both times — the
    # old per-pair existence check would instead have scaled with N.
    assert large_queries <= small_queries + 2


def test_purchase_order_full_lifecycle(db_session):
    headers = _auth_headers(db_session, "po-lifecycle@example.com", "testpass123")
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
    assert stock["items"][0]["quantity_on_hand"] == 30


def test_concurrent_partial_receipts_all_land(db_session):
    """Regression test for the stock_level_lock + with_for_update() added in
    Phase 7 (Change 7.7): fires many concurrent 1-unit partial receipts
    against one PO line and asserts both quantity_received and the
    resulting stock_levels.quantity_on_hand reflect every one of them —
    mirrors test_inventory.py::test_concurrent_stock_adjustments_all_land,
    which caught a real lost-update bug this same fix addresses."""
    headers = _auth_headers(db_session, "po-concurrency@example.com", "testpass123")
    supplier, warehouse, product = _setup_supplier_warehouse_product(headers)

    receipt_count = 20
    po = client.post(
        "/purchase-orders",
        json={
            "supplier_id": supplier["id"],
            "warehouse_id": warehouse["id"],
            "items": [{"product_id": product["id"], "quantity_ordered": receipt_count}],
        },
        headers=headers,
    ).json()
    for target in ("submitted", "approved"):
        client.put(f"/purchase-orders/{po['id']}/status", json={"status": target}, headers=headers)

    def receive_one():
        return client.post(
            f"/purchase-orders/{po['id']}/receive",
            json={"items": [{"product_id": product["id"], "quantity": 1}]},
            headers=headers,
        )

    with ThreadPoolExecutor(max_workers=8) as executor:
        responses = list(executor.map(lambda _: receive_one(), range(receipt_count)))

    assert all(r.status_code == 200 for r in responses)

    final_po = client.get(f"/purchase-orders/{po['id']}").json()
    assert final_po["items"][0]["quantity_received"] == receipt_count
    assert final_po["status"] == "received"

    stock = client.get(f"/stock?product_id={product['id']}&warehouse_id={warehouse['id']}").json()
    assert stock["items"][0]["quantity_on_hand"] == receipt_count


def test_purchase_order_rejects_unknown_supplier(db_session):
    headers = _auth_headers(db_session, "po-bad-supplier@example.com", "testpass123")
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
