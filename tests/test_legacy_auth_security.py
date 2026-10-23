"""Real temporary SQLite accounts; no service credentials or network calls."""
import hashlib
import sqlite3
import time

import jwt
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from backend.auth import AuthManager, get_current_user, JWT_ISSUER, JWT_AUDIENCE

KEY = "fixture-only-legacy-signing-secret-more-than-32-bytes"
PASSWORD = "Fixture-Password-With-Enough-Length!"


@pytest.fixture
def manager(tmp_path, monkeypatch):
    monkeypatch.setenv("JWT_SECRET", KEY)
    return AuthManager(str(tmp_path / "users.db"))


def account(manager):
    created = manager.register("fixture@example.invalid", PASSWORD, "Fixture")
    assert created["success"]
    login = manager.login("fixture@example.invalid", PASSWORD)
    assert login["success"]
    return created["user_id"], login


def update(manager, sql, values=()):
    with sqlite3.connect(manager.db_path) as connection:
        connection.execute(sql, values)


def test_schema_does_not_seed_an_admin_or_mutate_existing_users(manager, monkeypatch):
    assert manager.list_users() == []
    user_id, _ = account(manager)
    before = manager.get_user(user_id)
    monkeypatch.setenv("ADMIN_PASSWORD", "should-not-create-anyone")
    AuthManager(manager.db_path)
    assert manager.get_user(user_id) == before
    assert len(manager.list_users()) == 1


@pytest.mark.parametrize("key", ["", "short", "luqi-dev-secret-change-in-production"])
def test_missing_or_known_signing_key_fails_closed_without_creating_users(manager, monkeypatch, key):
    monkeypatch.setenv("JWT_SECRET", key)
    assert not manager.register("fixture@example.invalid", PASSWORD)["success"]
    assert not manager.login("fixture@example.invalid", PASSWORD)["success"]
    assert not manager.verify_token("invalid")["valid"]
    assert manager.list_users() == []


def test_per_password_salts_and_legacy_hash_upgrade_preserve_account(manager):
    a, b = manager._hash_password(PASSWORD), manager._hash_password(PASSWORD)
    assert a != b
    assert manager._verify_password(PASSWORD, a)
    assert not manager._verify_password("incorrect", a)
    old = hashlib.pbkdf2_hmac("sha256", PASSWORD.encode(), b"luqi-salt-v1", 100000).hex()
    update(manager, "INSERT INTO users(email,password_hash,full_name,role) VALUES(?,?,?,?)",
           ("old@example.invalid", old, "Preserved Name", "user"))
    assert not manager.login("old@example.invalid", "incorrect")["success"]
    with sqlite3.connect(manager.db_path) as connection:
        assert connection.execute("SELECT password_hash FROM users").fetchone()[0] == old
    login = manager.login("old@example.invalid", PASSWORD)
    assert login["success"]
    with sqlite3.connect(manager.db_path) as connection:
        row = connection.execute("SELECT id,password_hash,full_name,role FROM users").fetchone()
    assert row[1].startswith("pbkdf2_sha256$600000$")
    assert row[2:] == ("Preserved Name", "user")
    assert manager.verify_token(login["access_token"])["user_id"] == row[0]


@pytest.mark.parametrize("change,value", [("is_active", 0), ("is_active", None),
                                          ("role", "admin"), ("email", "changed@example.invalid"),
                                          ("password_hash", "changed")])
def test_account_changes_revoke_access_and_refresh(manager, change, value):
    user_id, login = account(manager)
    update(manager, f"UPDATE users SET {change}=? WHERE id=?", (value, user_id))
    assert not manager.verify_token(login["access_token"])["valid"]
    assert not manager.refresh_access_token(login["refresh_token"])["success"]
    if change == "is_active":
        assert not manager.login("fixture@example.invalid", PASSWORD)["success"]


def test_deleted_accounts_and_rotated_key_revoke_tokens(manager, monkeypatch):
    user_id, login = account(manager)
    monkeypatch.setenv("JWT_SECRET", "different-fixture-signing-secret-at-least-32-bytes")
    assert not manager.verify_token(login["access_token"])["valid"]
    monkeypatch.setenv("JWT_SECRET", KEY)
    update(manager, "DELETE FROM users WHERE id=?", (user_id,))
    assert not manager.verify_token(login["access_token"])["valid"]


def test_access_refresh_separation_and_real_fastapi_dependency(manager, monkeypatch):
    _, login = account(manager)
    assert not manager.verify_token(login["refresh_token"])["valid"]
    assert not manager.refresh_access_token(login["access_token"])["success"]
    refreshed = manager.refresh_access_token(login["refresh_token"])
    assert refreshed["success"]
    assert manager.verify_token(refreshed["access_token"])["valid"]
    monkeypatch.setattr("backend.auth.AuthManager", lambda: manager)
    app = FastAPI()

    @app.get("/private")
    def private(user=Depends(get_current_user)):
        return {"id": user["user_id"]}

    with TestClient(app) as client:
        assert client.get("/private", headers={"Authorization": "Bearer " + login["access_token"]}).status_code == 200
        assert client.get("/private", headers={"Authorization": "Bearer " + login["refresh_token"]}).status_code == 401
        assert client.get("/private", headers={"Authorization": "Bearer " + "x" * 5000}).status_code == 401


def test_missing_malformed_expired_foreign_or_overlong_claims_are_denied(manager):
    _, login = account(manager)
    claims = jwt.decode(login["access_token"], KEY, algorithms=["HS256"], audience=JWT_AUDIENCE, issuer=JWT_ISSUER)
    variants = [{}, {**claims, "sub": "not-an-id"}, {**claims, "cv": 1},
                {**claims, "exp": int(time.time()) - 100}, {**claims, "iat": int(time.time()) + 1000},
                {**claims, "exp": claims["iat"] + 86401}, {**claims, "iat": True},
                {**claims, "iss": "other"}, {**claims, "aud": "other"}, {**claims, "cv": "0" * 64}]
    for variant in variants:
        token = jwt.encode(variant, KEY, algorithm="HS256")
        assert not manager.verify_token(token)["valid"]
    assert not manager.verify_token(jwt.encode(claims, KEY, algorithm="HS384"))["valid"]


def test_concurrent_password_reset_cannot_issue_a_token_for_new_credentials(manager, monkeypatch):
    _, login = account(manager)
    original = manager._create_token

    def reset_then_issue(*args):
        update(manager, "UPDATE users SET password_hash=?", (manager._hash_password("Changed-Password-After-Verification!"),))
        return original(*args)

    monkeypatch.setattr(manager, "_create_token", reset_then_issue)
    assert not manager.refresh_access_token(login["refresh_token"])["success"]
