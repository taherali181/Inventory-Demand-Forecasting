# tests/test_pagination.py
"""Tests the PaginatedResponse contract (Phase 8, Change 8.7) against one
representative endpoint (products) — every other paginated list endpoint
(warehouses, suppliers, stock, alerts, purchase-orders, forecast) follows
the exact same skip/limit/total pattern from schemas.PaginatedResponse."""
from fastapi.testclient import TestClient

from conftest import promote_to_admin
from main import app

client = TestClient(app)


def _admin_headers(db_session, email="pagination@example.com", password="testpass123"):
    client.post("/auth/register", json={"email": email, "password": password})
    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    promote_to_admin(db_session, email)
    return {"Authorization": f"Bearer {token}"}


def test_products_pagination_total_and_slicing(db_session):
    headers = _admin_headers(db_session)
    for i in range(7):
        client.post("/products", json={"sku_code": f"PG-{i}", "name": f"Widget {i}"}, headers=headers)

    first_page = client.get("/products?limit=3", headers=headers).json()
    assert first_page["total"] == 7
    assert len(first_page["items"]) == 3

    second_page = client.get("/products?limit=3&skip=3", headers=headers).json()
    assert second_page["total"] == 7
    assert len(second_page["items"]) == 3

    third_page = client.get("/products?limit=3&skip=6", headers=headers).json()
    assert third_page["total"] == 7
    assert len(third_page["items"]) == 1

    # Pages don't overlap and together cover every product exactly once.
    all_ids = [p["id"] for page in (first_page, second_page, third_page) for p in page["items"]]
    assert len(all_ids) == len(set(all_ids)) == 7

    default_page = client.get("/products", headers=headers).json()
    assert default_page["total"] == 7
    assert len(default_page["items"]) == 7  # default limit (50) comfortably covers 7 rows


def test_pagination_limit_is_capped(db_session):
    headers = _admin_headers(db_session, "pagination-cap@example.com")
    response = client.get("/products?limit=500", headers=headers)
    assert response.status_code == 422  # limit's le=200 constraint rejects it
