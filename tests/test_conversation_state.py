"""Tests for conversation state."""

import pytest
from conversation_state import ConversationState


def test_state_creation():
    state = ConversationState("test_user")
    assert state.user_id == "test_user"
    assert state.context == {}


def test_state_update():
    state = ConversationState("test_user")
    state.update_context({"topic": "test"})
    assert state.context["topic"] == "test"
