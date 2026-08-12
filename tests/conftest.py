"""Test configuration and fixtures."""

import pytest
from omega_ai import OmegaAI


@pytest.fixture
def omega():
    """Create an Omega AI instance for testing."""
    app = OmegaAI()
    app.initialize()
    return app


@pytest.fixture
def client():
    """Create a test client."""
    from api_server import app
    from fastapi.testclient import TestClient
    return TestClient(app)
