# tests/test_users.py
"""Tests the admin user-management panel (Phase 11, Change 11.6): GET
/users, PATCH /users/{id}/role, PATCH /users/{id}/deactivate — all gated
by require_admin (Phase 7)."""
from fastapi.testclient import TestClient

from conftest import promote_to_admin
from main import app

client = TestClient(app)


def _register_and_login(email: str, password: str = "testpass123") -> str:
    client.post("/auth/register", json={"email": email, "password": password})
    return client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_non_admins_get_403_on_all_three_endpoints(db_session):
    staff_token = _register_and_login("staff-users@example.com")
    staff_headers = _headers(staff_token)

    assert client.get("/users", headers=staff_headers).status_code == 403
    assert client.patch("/users/1/role", json={"role": "admin"}, headers=staff_headers).status_code == 403
    assert client.patch("/users/1/deactivate", headers=staff_headers).status_code == 403


def test_admin_can_list_promote_and_deactivate_a_user(db_session):
    admin_token = _register_and_login("admin-users@example.com")
    promote_to_admin(db_session, "admin-users@example.com")
    admin_headers = _headers(admin_token)

    _register_and_login("target-user@example.com")

    listing = client.get("/users", headers=admin_headers)
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 2
    target = next(u for u in body["items"] if u["email"] == "target-user@example.com")
    assert target["role"] == "staff"
    assert target["is_active"] is True

    promote = client.patch(f"/users/{target['id']}/role", json={"role": "admin"}, headers=admin_headers)
    assert promote.status_code == 200
    assert promote.json()["role"] == "admin"

    deactivate = client.patch(f"/users/{target['id']}/deactivate", headers=admin_headers)
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False

    # Deactivation takes effect immediately — can't even log in again
    # (POST /auth/login's own is_active check, 403 — distinct from the
    # 401 it returns for a wrong password).
    target_login = client.post(
        "/auth/login", json={"email": "target-user@example.com", "password": "testpass123"}
    )
    assert target_login.status_code == 403


def test_admin_cannot_change_their_own_role_or_deactivate_themselves(db_session):
    admin_token = _register_and_login("self-admin@example.com")
    promote_to_admin(db_session, "self-admin@example.com")
    admin_headers = _headers(admin_token)

    me = client.get("/auth/me", headers=admin_headers).json()

    role_response = client.patch(f"/users/{me['id']}/role", json={"role": "staff"}, headers=admin_headers)
    assert role_response.status_code == 400
    assert "own role" in role_response.json()["detail"]

    deactivate_response = client.patch(f"/users/{me['id']}/deactivate", headers=admin_headers)
    assert deactivate_response.status_code == 400
    assert "own account" in deactivate_response.json()["detail"]

    # Confirm neither actually took effect.
    still_me = client.get("/auth/me", headers=admin_headers).json()
    assert still_me["role"] == "admin"
    assert still_me["is_active"] is True


def test_role_and_deactivate_endpoints_404_for_an_unknown_user(db_session):
    admin_token = _register_and_login("admin-404@example.com")
    promote_to_admin(db_session, "admin-404@example.com")
    admin_headers = _headers(admin_token)

    assert client.patch("/users/999999/role", json={"role": "admin"}, headers=admin_headers).status_code == 404
    assert client.patch("/users/999999/deactivate", headers=admin_headers).status_code == 404
