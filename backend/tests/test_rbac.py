# tests/test_rbac.py
"""Verifies the staff/admin split introduced by require_admin (Phase 7,
Change 7.5): admin-level writes (creating master data, cancelling a PO)
reject a plain staff account; staff-level writes (adjusting stock, creating
POs, receiving) accept one."""
from fastapi.testclient import TestClient

from conftest import promote_to_admin
from main import app

client = TestClient(app)


def _register_and_login(email: str, password: str = "testpass123") -> str:
    client.post("/auth/register", json={"email": email, "password": password})
    return client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_staff_cannot_create_master_data_but_admin_can(db_session):
    staff_token = _register_and_login("staff-rbac@example.com")
    staff_headers = _headers(staff_token)

    staff_warehouse = client.post("/warehouses", json={"name": "W", "code": "STAFF-W"}, headers=staff_headers)
    assert staff_warehouse.status_code == 403

    staff_supplier = client.post("/suppliers", json={"name": "S"}, headers=staff_headers)
    assert staff_supplier.status_code == 403

    staff_product = client.post("/products", json={"sku_code": "STAFF-SKU", "name": "P"}, headers=staff_headers)
    assert staff_product.status_code == 403

    admin_token = _register_and_login("admin-rbac@example.com")
    promote_to_admin(db_session, "admin-rbac@example.com")
    admin_headers = _headers(admin_token)

    admin_warehouse = client.post("/warehouses", json={"name": "W", "code": "ADMIN-W"}, headers=admin_headers)
    assert admin_warehouse.status_code == 201


def test_staff_cannot_update_or_deactivate_products_but_admin_can(db_session):
    admin_token = _register_and_login("admin-update@example.com")
    promote_to_admin(db_session, "admin-update@example.com")
    admin_headers = _headers(admin_token)

    product = client.post(
        "/products", json={"sku_code": "UPDATE-SKU", "name": "Widget"}, headers=admin_headers
    ).json()

    staff_token = _register_and_login("staff-update@example.com")
    staff_headers = _headers(staff_token)

    staff_update = client.put(f"/products/{product['id']}", json={"name": "Renamed"}, headers=staff_headers)
    assert staff_update.status_code == 403

    staff_deactivate = client.delete(f"/products/{product['id']}", headers=staff_headers)
    assert staff_deactivate.status_code == 403

    admin_update = client.put(f"/products/{product['id']}", json={"name": "Renamed"}, headers=admin_headers)
    assert admin_update.status_code == 200
    assert admin_update.json()["name"] == "Renamed"


def test_staff_can_do_day_to_day_operations(db_session):
    """Stock adjustments, PO creation/receiving, and forecast runs stay
    staff-accessible — require_admin should NOT gate these."""
    admin_token = _register_and_login("admin-setup@example.com")
    promote_to_admin(db_session, "admin-setup@example.com")
    admin_headers = _headers(admin_token)

    warehouse = client.post("/warehouses", json={"name": "W", "code": "OPS-W"}, headers=admin_headers).json()
    supplier = client.post("/suppliers", json={"name": "S"}, headers=admin_headers).json()
    product = client.post(
        "/products", json={"sku_code": "OPS-SKU", "name": "Widget"}, headers=admin_headers
    ).json()

    staff_token = _register_and_login("staff-ops@example.com")
    staff_headers = _headers(staff_token)

    adjust = client.post(
        "/stock/adjust",
        json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": 10},
        headers=staff_headers,
    )
    assert adjust.status_code == 200

    create_po = client.post(
        "/purchase-orders",
        json={
            "supplier_id": supplier["id"],
            "warehouse_id": warehouse["id"],
            "items": [{"product_id": product["id"], "quantity_ordered": 5}],
        },
        headers=staff_headers,
    )
    assert create_po.status_code == 201


def test_staff_cannot_cancel_purchase_order_but_admin_can(db_session):
    admin_token = _register_and_login("admin-cancel@example.com")
    promote_to_admin(db_session, "admin-cancel@example.com")
    admin_headers = _headers(admin_token)

    warehouse = client.post("/warehouses", json={"name": "W", "code": "CANCEL-W"}, headers=admin_headers).json()
    supplier = client.post("/suppliers", json={"name": "S"}, headers=admin_headers).json()
    product = client.post(
        "/products", json={"sku_code": "CANCEL-SKU", "name": "Widget"}, headers=admin_headers
    ).json()

    staff_token = _register_and_login("staff-cancel@example.com")
    staff_headers = _headers(staff_token)

    po = client.post(
        "/purchase-orders",
        json={
            "supplier_id": supplier["id"],
            "warehouse_id": warehouse["id"],
            "items": [{"product_id": product["id"], "quantity_ordered": 5}],
        },
        headers=staff_headers,
    ).json()

    staff_cancel = client.put(f"/purchase-orders/{po['id']}/status", json={"status": "cancelled"}, headers=staff_headers)
    assert staff_cancel.status_code == 403

    # Staff CAN still submit it (routine transition, not admin-gated).
    staff_submit = client.put(f"/purchase-orders/{po['id']}/status", json={"status": "submitted"}, headers=staff_headers)
    assert staff_submit.status_code == 200

    admin_cancel = client.put(f"/purchase-orders/{po['id']}/status", json={"status": "cancelled"}, headers=admin_headers)
    assert admin_cancel.status_code == 200
    assert admin_cancel.json()["status"] == "cancelled"
