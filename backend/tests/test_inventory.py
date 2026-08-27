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

    # Only the two successful adjustments logged a stock_movements row —
    # adjust_stock rejects the over-adjustment (delta -100) with 400 before
    # writing one. GET /stock/movements surfaces that existing audit trail
    # (Change 10.6).
    movements = client.get(f"/stock/movements?product_id={product['id']}").json()
    assert movements["total"] == 2
    assert sorted(m["quantity_delta"] for m in movements["items"]) == [-5, 20]


def test_stock_movements_filters_by_product_and_warehouse(db_session):
    headers = _auth_headers(db_session, "movements@example.com", "testpass123")

    wh1 = client.post("/warehouses", json={"name": "W1", "code": "W1"}, headers=headers).json()
    wh2 = client.post("/warehouses", json={"name": "W2", "code": "W2"}, headers=headers).json()
    p1 = client.post("/products", json={"sku_code": "SKU-A", "name": "A"}, headers=headers).json()
    p2 = client.post("/products", json={"sku_code": "SKU-B", "name": "B"}, headers=headers).json()

    client.post(
        "/stock/adjust",
        json={"product_id": p1["id"], "warehouse_id": wh1["id"], "quantity_delta": 10},
        headers=headers,
    )
    client.post(
        "/stock/adjust",
        json={"product_id": p2["id"], "warehouse_id": wh2["id"], "quantity_delta": 5},
        headers=headers,
    )

    by_product = client.get(f"/stock/movements?product_id={p1['id']}").json()
    assert by_product["total"] == 1
    assert by_product["items"][0]["product_id"] == p1["id"]

    by_warehouse = client.get(f"/stock/movements?warehouse_id={wh2['id']}").json()
    assert by_warehouse["total"] == 1
    assert by_warehouse["items"][0]["warehouse_id"] == wh2["id"]

    unfiltered = client.get("/stock/movements").json()
    assert unfiltered["total"] == 2


def test_products_search_matches_name_or_sku_case_insensitively(db_session):
    headers = _auth_headers(db_session, "search@example.com", "testpass123")
    client.post("/products", json={"sku_code": "ABC-1", "name": "Red Widget"}, headers=headers)
    client.post("/products", json={"sku_code": "XYZ-2", "name": "Blue Gadget"}, headers=headers)

    by_name = client.get("/products?search=widget").json()
    assert by_name["total"] == 1
    assert by_name["items"][0]["sku_code"] == "ABC-1"

    by_sku = client.get("/products?search=xyz").json()
    assert by_sku["total"] == 1
    assert by_sku["items"][0]["name"] == "Blue Gadget"

    no_match = client.get("/products?search=nonexistent").json()
    assert no_match["total"] == 0


def test_warehouses_and_suppliers_search_by_name(db_session):
    headers = _auth_headers(db_session, "search2@example.com", "testpass123")
    client.post("/warehouses", json={"name": "North Distribution Center", "code": "NDC"}, headers=headers)
    client.post("/warehouses", json={"name": "South Depot", "code": "SD"}, headers=headers)
    client.post("/suppliers", json={"name": "Acme Supply Co"}, headers=headers)
    client.post("/suppliers", json={"name": "Global Parts"}, headers=headers)

    warehouses = client.get("/warehouses?search=north").json()
    assert warehouses["total"] == 1
    assert warehouses["items"][0]["code"] == "NDC"

    suppliers = client.get("/suppliers?search=acme").json()
    assert suppliers["total"] == 1
    assert suppliers["items"][0]["name"] == "Acme Supply Co"


def test_products_export_returns_csv_with_expected_rows(db_session):
    headers = _auth_headers(db_session, "export@example.com", "testpass123")
    client.post("/products", json={"sku_code": "EXP-1", "name": "Exportable Widget"}, headers=headers)
    client.post("/products", json={"sku_code": "EXP-2", "name": "Another Widget"}, headers=headers)
    deactivated = client.post("/products", json={"sku_code": "EXP-3", "name": "Inactive Widget"}, headers=headers).json()
    client.delete(f"/products/{deactivated['id']}", headers=headers)

    response = client.get("/products/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=products.csv" in response.headers["content-disposition"]

    lines = response.text.strip().splitlines()
    assert lines[0].split(",")[0:3] == ["id", "sku_code", "name"]
    # Default excludes the deactivated product, same as GET /products.
    assert "EXP-1" in response.text
    assert "EXP-2" in response.text
    assert "EXP-3" not in response.text

    with_inactive = client.get("/products/export?include_inactive=true")
    assert "EXP-3" in with_inactive.text


def test_products_export_route_is_not_shadowed_by_product_id_route(db_session):
    # "/products/export" must not be captured by GET /products/{product_id}
    # (which would try to parse "export" as an int product_id and 422) —
    # regression guard for the declaration-order fix this route needed.
    response = client.get("/products/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")


def test_purchase_orders_export_returns_one_row_per_line_item(db_session):
    headers = _auth_headers(db_session, "po-export@example.com", "testpass123")
    supplier = client.post("/suppliers", json={"name": "Acme"}, headers=headers).json()
    warehouse = client.post("/warehouses", json={"name": "W1", "code": "W1"}, headers=headers).json()
    p1 = client.post("/products", json={"sku_code": "PO-EXP-1", "name": "A"}, headers=headers).json()
    p2 = client.post("/products", json={"sku_code": "PO-EXP-2", "name": "B"}, headers=headers).json()

    client.post(
        "/purchase-orders",
        json={
            "supplier_id": supplier["id"],
            "warehouse_id": warehouse["id"],
            "items": [
                {"product_id": p1["id"], "quantity_ordered": 5, "unit_cost": 1.5},
                {"product_id": p2["id"], "quantity_ordered": 3, "unit_cost": 2.0},
            ],
        },
        headers=headers,
    )

    response = client.get("/purchase-orders/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")

    lines = response.text.strip().splitlines()
    assert lines[0].split(",") == [
        "po_number",
        "status",
        "supplier_id",
        "warehouse_id",
        "order_date",
        "expected_delivery_date",
        "product_id",
        "quantity_ordered",
        "quantity_received",
        "unit_cost",
    ]
    assert len(lines) == 3  # header + one row per line item, not one per PO


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
