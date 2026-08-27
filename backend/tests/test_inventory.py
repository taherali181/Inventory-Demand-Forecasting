# tests/test_inventory.py
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _auth_headers(email="inv@example.com", password="testpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_warehouse_crud_requires_auth_for_writes(db_session):
    unauth_response = client.post("/warehouses", json={"name": "Main", "code": "MAIN"})
    assert unauth_response.status_code == 401

    headers = _auth_headers()
    create_response = client.post("/warehouses", json={"name": "Main", "code": "MAIN"}, headers=headers)
    assert create_response.status_code == 201
    warehouse_id = create_response.json()["id"]

    duplicate_response = client.post("/warehouses", json={"name": "Main 2", "code": "MAIN"}, headers=headers)
    assert duplicate_response.status_code == 400

    list_response = client.get("/warehouses")
    assert list_response.status_code == 200
    assert any(w["id"] == warehouse_id for w in list_response.json())

    update_response = client.put(f"/warehouses/{warehouse_id}", json={"city": "Austin"}, headers=headers)
    assert update_response.status_code == 200
    assert update_response.json()["city"] == "Austin"

    delete_response = client.delete(f"/warehouses/{warehouse_id}", headers=headers)
    assert delete_response.status_code == 204
    assert client.get("/warehouses").json() == []  # deactivated, excluded by default

    assert client.get("/warehouses/999999").status_code == 404


def test_product_rejects_unknown_supplier(db_session):
    headers = _auth_headers("supplier-check@example.com", "testpass123")
    response = client.post(
        "/products",
        json={"sku_code": "SKU-BAD", "name": "Widget", "default_supplier_id": 999999},
        headers=headers,
    )
    assert response.status_code == 400


def test_product_and_stock_adjustment_flow(db_session):
    headers = _auth_headers("stock@example.com", "testpass123")

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
    assert len(list_response.json()) == 1


def test_stock_adjust_requires_auth(db_session):
    response = client.post(
        "/stock/adjust", json={"product_id": 1, "warehouse_id": 1, "quantity_delta": 1}
    )
    assert response.status_code == 401
