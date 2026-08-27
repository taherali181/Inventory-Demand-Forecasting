# tests/test_auth.py
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_register_login_and_me(db_session):
    register_response = client.post(
        "/auth/register",
        json={"email": "test@example.com", "password": "s3cret-pw", "full_name": "Test User"},
    )
    assert register_response.status_code == 201
    assert register_response.json()["email"] == "test@example.com"

    duplicate_response = client.post(
        "/auth/register", json={"email": "test@example.com", "password": "another-pw"}
    )
    assert duplicate_response.status_code == 400

    login_response = client.post("/auth/login", json={"email": "test@example.com", "password": "s3cret-pw"})
    assert login_response.status_code == 200
    login_body = login_response.json()
    assert "refresh_token" in login_body
    token = login_body["access_token"]

    bad_login_response = client.post("/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert bad_login_response.status_code == 401

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test@example.com"


def test_me_requires_authentication(db_session):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_refresh_issues_a_new_access_token(db_session):
    client.post("/auth/register", json={"email": "refresh@example.com", "password": "s3cret-pw"})
    login_body = client.post("/auth/login", json={"email": "refresh@example.com", "password": "s3cret-pw"}).json()

    refresh_response = client.post("/auth/refresh", json={"refresh_token": login_body["refresh_token"]})
    assert refresh_response.status_code == 200
    new_access_token = refresh_response.json()["access_token"]

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {new_access_token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "refresh@example.com"


def test_refresh_rejects_unknown_or_garbage_token(db_session):
    response = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert response.status_code == 401


def test_logout_revokes_the_refresh_token(db_session):
    client.post("/auth/register", json={"email": "logout@example.com", "password": "s3cret-pw"})
    login_body = client.post("/auth/login", json={"email": "logout@example.com", "password": "s3cret-pw"}).json()
    refresh_token = login_body["refresh_token"]

    logout_response = client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert logout_response.status_code == 204

    refresh_after_logout = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_after_logout.status_code == 401

    # Idempotent: logging out an already-revoked token still 204s.
    second_logout = client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert second_logout.status_code == 204
