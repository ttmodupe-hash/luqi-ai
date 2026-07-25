"""
Integration tests for Omega AI modules working together.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from conversation_state import ConversationState
from cache_manager import CacheManager
from knowledge_base import KnowledgeBase


class TestIntegration:
    """Integration test suite for Omega AI."""

    def test_conversation_with_cache(self):
        """Test conversation state working with cache."""
        cache = CacheManager()
        state = ConversationState()
        
        conv_id = state.create_conversation(user_id="user1")
        state.add_message(conv_id, "user", "What is Bitcoin?")
        
        # Cache the conversation context
        context = state.get_context_summary(conv_id)
        cache.set(f"context_{conv_id}", context)
        
        # Retrieve from cache
        cached = cache.get(f"context_{conv_id}")
        assert cached is not None
        assert cached == context

    def test_knowledge_with_conversation(self):
        """Test knowledge base integration with conversations."""
        kb = KnowledgeBase()
        state = ConversationState()
        
        # Add knowledge
        kb.add_entry("crypto", "Bitcoin", "Bitcoin is digital gold")
        
        # Create conversation referencing knowledge
        conv_id = state.create_conversation(user_id="user1")
        state.add_message(conv_id, "user", "Tell me about Bitcoin")
        
        # Query knowledge
        results = kb.search("Bitcoin")
        assert len(results) > 0
        assert any("Bitcoin" in r["title"] for r in results)

    def test_full_pipeline(self):
        """Test a full pipeline: conversation -> knowledge -> cache."""
        cache = CacheManager()
        state = ConversationState()
        kb = KnowledgeBase()
        
        # Setup
        kb.add_entry("finance", "Stocks", "Stocks represent company ownership")
        conv_id = state.create_conversation(user_id="user1")
        
        # User asks about stocks
        state.add_message(conv_id, "user", "What are stocks?")
        
        # System retrieves knowledge
        knowledge = kb.search("stocks")
        assert len(knowledge) > 0
        
        # Response is cached
        response_key = f"response_{conv_id}"
        cache.set(response_key, knowledge[0]["content"])
        
        # Verify cache hit
        cached_response = cache.get(response_key)
        assert cached_response is not None
        assert "ownership" in cached_response

    def test_multiple_conversations(self):
        """Test handling multiple conversations simultaneously."""
        state = ConversationState()
        
        conv1 = state.create_conversation(user_id="user1", title="Chat 1")
        conv2 = state.create_conversation(user_id="user1", title="Chat 2")
        conv3 = state.create_conversation(user_id="user2", title="Chat 3")
        
        state.add_message(conv1, "user", "Message in chat 1")
        state.add_message(conv2, "user", "Message in chat 2")
        state.add_message(conv3, "user", "Message in chat 3")
        
        # Each conversation should have independent state
        assert len(state.get_messages(conv1)) == 1
        assert len(state.get_messages(conv2)) == 1
        assert len(state.get_messages(conv3)) == 1

    def test_error_handling_pipeline(self):
        """Test error handling across the pipeline."""
        state = ConversationState()
        
        # Invalid conversation ID should be handled gracefully
        messages = state.get_messages("nonexistent-id")
        assert messages == [] or messages is not None