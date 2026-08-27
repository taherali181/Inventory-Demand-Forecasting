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
    token = login_response.json()["access_token"]

    bad_login_response = client.post("/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert bad_login_response.status_code == 401

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test@example.com"


def test_me_requires_authentication(db_session):
    response = client.get("/auth/me")
    assert response.status_code == 401
