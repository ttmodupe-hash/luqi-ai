"""Test configuration and fixtures for LUQI AI"""
import os
import pytest
import asyncio
from typing import AsyncGenerator
from fastapi import FastAPI
from httpx import AsyncClient

from backend.main import app
from backend.db import get_db, AsyncSessionLocal
from backend.auth import AuthManager


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_client() -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
async def db_session() -> AsyncGenerator:
    """Create a test database session."""
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
def auth_manager() -> AuthManager:
    """Create an auth manager for testing."""
    return AuthManager(db_path="data/test_users.db")


@pytest.fixture
def sample_user(auth_manager: AuthManager) -> dict:
    """Create a sample user for testing."""
    result = auth_manager.register("test@luqi.ai", "testpassword", "Test User")
    return result


@pytest.fixture
def sample_token(auth_manager: AuthManager, sample_user: dict) -> str:
    """Get a sample auth token for testing."""
    result = auth_manager.login("test@luqi.ai", "testpassword")
    return result["access_token"]


@pytest.fixture
def authorized_headers(sample_token: str) -> dict:
    """Get headers with authorization for testing."""
    return {"Authorization": f"Bearer {sample_token}"}
