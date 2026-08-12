"""Tests for Omega routes in LUQI AI"""
import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from backend.omega_routes import router as omega_router


@pytest.fixture
def omega_app():
    """Create a test app with omega routes."""
    app = FastAPI()
    app.include_router(omega_router)
    return app


@pytest.fixture
async def omega_client(omega_app):
    """Create a test client for omega routes."""
    async with AsyncClient(app=omega_app, base_url="http://test") as client:
        yield client


class TestOmegaCapabilities:
    """Test capability management endpoints."""

    async def test_list_capabilities(self, omega_client: AsyncClient):
        """Test listing all capabilities."""
        response = await omega_client.get("/omega/capabilities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert all("name" in cap for cap in data)
        assert all("type" in cap for cap in data)

    async def test_list_enabled_capabilities(self, omega_client: AsyncClient):
        """Test listing enabled capabilities."""
        response = await omega_client.get("/omega/capabilities/enabled")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_toggle_capability(self, omega_client: AsyncClient):
        """Test toggling a capability."""
        # Disable a capability
        response = await omega_client.post(
            "/omega/capabilities/toggle",
            json={"name": "advanced_reasoning", "enabled": False},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["enabled"] is False

        # Re-enable
        response = await omega_client.post(
            "/omega/capabilities/toggle",
            json={"name": "advanced_reasoning", "enabled": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True

    async def test_toggle_nonexistent_capability(self, omega_client: AsyncClient):
        """Test toggling a non-existent capability."""
        response = await omega_client.post(
            "/omega/capabilities/toggle",
            json={"name": "nonexistent", "enabled": False},
        )
        assert response.status_code == 404

    async def test_update_capability_config(self, omega_client: AsyncClient):
        """Test updating capability configuration."""
        response = await omega_client.post(
            "/omega/capabilities/config",
            json={"name": "advanced_reasoning", "config": {"max_steps": 20}},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["config"]["max_steps"] == 20


class TestOmegaReasoning:
    """Test reasoning endpoints."""

    async def test_advanced_reasoning(self, omega_client: AsyncClient):
        """Test the reasoning endpoint."""
        response = await omega_client.post(
            "/omega/reason",
            json={"problem": "What is the meaning of life?", "steps": 3},
        )
        assert response.status_code == 200
        data = response.json()
        assert "steps_taken" in data
        assert "conclusion" in data
        assert data["confidence"] > 0

    async def test_reasoning_capability_disabled(self, omega_client: AsyncClient):
        """Test reasoning when capability is disabled."""
        # First disable the capability
        await omega_client.post(
            "/omega/capabilities/toggle",
            json={"name": "advanced_reasoning", "enabled": False},
        )
        
        response = await omega_client.post(
            "/omega/reason",
            json={"problem": "Test problem"},
        )
        assert response.status_code == 503
        
        # Re-enable
        await omega_client.post(
            "/omega/capabilities/toggle",
            json={"name": "advanced_reasoning", "enabled": True},
        )


class TestOmegaCodeGeneration:
    """Test code generation endpoints."""

    async def test_generate_code(self, omega_client: AsyncClient):
        """Test code generation."""
        response = await omega_client.post(
            "/omega/code/generate",
            json={"prompt": "Create a hello world function", "language": "python"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "code" in data
        assert "language" in data
        assert data["language"] == "python"

    async def test_generate_code_unsupported_language(self, omega_client: AsyncClient):
        """Test code generation with unsupported language."""
        response = await omega_client.post(
            "/omega/code/generate",
            json={"prompt": "Hello", "language": "brainfuck"},
        )
        assert response.status_code == 400

    async def test_generate_code_capability_disabled(self, omega_client: AsyncClient):
        """Test code generation when capability is disabled."""
        await omega_client.post(
            "/omega/capabilities/toggle",
            json={"name": "code_generation", "enabled": False},
        )
        
        response = await omega_client.post(
            "/omega/code/generate",
            json={"prompt": "Hello", "language": "python"},
        )
        assert response.status_code == 503
        
        # Re-enable
        await omega_client.post(
            "/omega/capabilities/toggle",
            json={"name": "code_generation", "enabled": True},
        )


class TestOmegaStatus:
    """Test status endpoints."""

    async def test_omega_status(self, omega_client: AsyncClient):
        """Test the status endpoint."""
        response = await omega_client.get("/omega/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        assert "version" in data
        assert "capabilities_total" in data
        assert "capabilities_enabled" in data
