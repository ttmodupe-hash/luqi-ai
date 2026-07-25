"""
Pytest configuration and shared fixtures for Omega AI test suite.
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def sample_conversation_data():
    """Sample conversation data for testing."""
    return {
        "id": "test-conv-123",
        "user_id": "test-user-456",
        "messages": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
    }


@pytest.fixture
def sample_knowledge_entries():
    """Sample knowledge base entries for testing."""
    return [
        {
            "category": "finance",
            "title": "What is a stock?",
            "content": "A stock represents ownership in a company."
        },
        {
            "category": "crypto",
            "title": "What is Bitcoin?",
            "content": "Bitcoin is a decentralized digital currency."
        }
    ]