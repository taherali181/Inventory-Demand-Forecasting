# tests/test_inventory.py
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from main import app
from conftest import promote_to_admin

client = TestClient(app)


def _auth_headers(db_session, email="inv@example.com", password="testpass123"):
    """Registers a user, logs in, and promotes them to admin — every test in
    this file creates warehouses/products/suppliers, which require_admin now
    gates (see Phase 7 RBAC). test_rbac.py separately covers the staff-gets-
    403/admin-succeeds distinction itself."""
    client.post("/auth/register", json={"email": email, "password": password})
    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    promote_to_admin(db_session, email)
    return {"Authorization": f"Bearer {token}"}


def test_warehouse_crud_requires_auth_for_writes(db_session):
    unauth_response = client.post("/warehouses", json={"name": "Main", "code": "MAIN"})
    assert unauth_response.status_code == 401

    headers = _auth_headers(db_session)
    create_response = client.post("/warehouses", json={"name": "Main", "code": "MAIN"}, headers=headers)
    assert create_response.status_code == 201
    warehouse_id = create_response.json()["id"]

    duplicate_response = client.post("/warehouses", json={"name": "Main 2", "code": "MAIN"}, headers=headers)
    assert duplicate_response.status_code == 400

    list_response = client.get("/warehouses")
    assert list_response.status_code == 200
    list_body = list_response.json()
    assert list_body["total"] == 1
    assert any(w["id"] == warehouse_id for w in list_body["items"])

    update_response = client.put(f"/warehouses/{warehouse_id}", json={"city": "Austin"}, headers=headers)
    assert update_response.status_code == 200
    assert update_response.json()["city"] == "Austin"

    delete_response = client.delete(f"/warehouses/{warehouse_id}", headers=headers)
    assert delete_response.status_code == 204
    # Deactivated, excluded by default.
    deactivated_list = client.get("/warehouses").json()
    assert deactivated_list == {"items": [], "total": 0}

    assert client.get("/warehouses/999999").status_code == 404


def test_product_rejects_unknown_supplier(db_session):
    headers = _auth_headers(db_session, "supplier-check@example.com", "testpass123")
    response = client.post(
        "/products",
        json={"sku_code": "SKU-BAD", "name": "Widget", "default_supplier_id": 999999},
        headers=headers,
    )
    assert response.status_code == 400


def test_product_and_stock_adjustment_flow(db_session):
    headers = _auth_headers(db_session, "stock@example.com", "testpass123")

    warehouse = client.post("/warehouses", json={"name": "W1", "code": "W1"}, headers=headers).json()
    product = client.post(
        "/products", json={"sku_code": "SKU-1", "name": "Widget", "reorder_point": 5}, headers=headers
    ).json()

    adjust_up = client.post(
        "/stock/adjust",
        json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": 20},
        headers=headers,
    )
    assert adjust_up.status_code == 200
    assert adjust_up.json()["quantity_on_hand"] == 20
    assert adjust_up.json()["quantity_available"] == 20

    over_adjust = client.post(
        "/stock/adjust",
        json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": -100},
        headers=headers,
    )
    assert over_adjust.status_code == 400

    adjust_down = client.post(
        "/stock/adjust",
        json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": -5},
        headers=headers,
    )
    assert adjust_down.status_code == 200
    assert adjust_down.json()["quantity_on_hand"] == 15

    list_response = client.get(f"/stock?product_id={product['id']}")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert len(list_response.json()["items"]) == 1


def test_stock_adjust_requires_auth(db_session):
    response = client.post(
        "/stock/adjust", json={"product_id": 1, "warehouse_id": 1, "quantity_delta": 1}
    )
    assert response.status_code == 401


def test_concurrent_stock_adjustments_all_land(db_session):
    """Regression test for the with_for_update() row lock added in Phase 7
    (Change 7.6): fires many concurrent +1 adjustments at the same
    product/warehouse and asserts the final total reflects every one of
    them. SQLite (used in tests) has no real FOR UPDATE support and
    Python's GIL limits true interleaving, so this can't force the exact
    lost-update race the lock defends against on Postgres — but it's a
    solid regression guard on the read-modify-write logic itself, and
    confirms with_for_update() doesn't error out under SQLite."""
    headers = _auth_headers(db_session, "concurrency@example.com", "testpass123")
    warehouse = client.post("/warehouses", json={"name": "W", "code": "CONC-W"}, headers=headers).json()
    product = client.post(
        "/products", json={"sku_code": "CONC-SKU", "name": "Widget"}, headers=headers
    ).json()

    def adjust_by_one():
        return client.post(
            "/stock/adjust",
            json={"product_id": product["id"], "warehouse_id": warehouse["id"], "quantity_delta": 1},
            headers=headers,
        )

    adjustment_count = 20
    with ThreadPoolExecutor(max_workers=8) as executor:
        responses = list(executor.map(lambda _: adjust_by_one(), range(adjustment_count)))

    assert all(r.status_code == 200 for r in responses)

    final = client.get(f"/stock?product_id={product['id']}&warehouse_id={warehouse['id']}").json()
    assert final["items"][0]["quantity_on_hand"] == adjustment_count
