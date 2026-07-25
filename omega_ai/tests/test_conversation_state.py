"""
Tests for conversation_state module.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from conversation_state import ConversationState


class TestConversationState:
    """Test suite for ConversationState."""

    def test_create_conversation(self):
        """Test creating a new conversation."""
        state = ConversationState()
        conv_id = state.create_conversation(user_id="user1")
        assert conv_id is not None
        assert len(conv_id) > 0

    def test_add_message(self):
        """Test adding messages to a conversation."""
        state = ConversationState()
        conv_id = state.create_conversation(user_id="user1")
        state.add_message(conv_id, "user", "Hello")
        state.add_message(conv_id, "assistant", "Hi!")
        messages = state.get_messages(conv_id)
        assert len(messages) == 2
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"

    def test_get_messages_empty(self):
        """Test getting messages from empty conversation."""
        state = ConversationState()
        conv_id = state.create_conversation(user_id="user1")
        messages = state.get_messages(conv_id)
        assert len(messages) == 0

    def test_context_summary(self):
        """Test context summarization."""
        state = ConversationState()
        conv_id = state.create_conversation(user_id="user1")
        state.add_message(conv_id, "user", "What is Bitcoin?")
        state.add_message(conv_id, "assistant", "Bitcoin is a cryptocurrency.")
        summary = state.get_context_summary(conv_id)
        assert "Bitcoin" in summary or len(summary) > 0

    def test_conversation_metadata(self):
        """Test conversation metadata operations."""
        state = ConversationState()
        conv_id = state.create_conversation(user_id="user1", title="Test Chat")
        meta = state.get_metadata(conv_id)
        assert meta["title"] == "Test Chat"
        assert meta["user_id"] == "user1"