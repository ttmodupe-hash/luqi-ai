"""Shared fixtures for Omega AI test suite."""
from __future__ import annotations

import os
import sys
import tempfile

# Ensure parent package is importable (omega_ai/ directory)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _PROJECT_ROOT)
os.chdir(_PROJECT_ROOT)

import pytest


@pytest.fixture
def temp_db_path():
    """Provide a temporary database file path."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    # Cleanup
    try:
        os.unlink(path)
    except OSError:
        pass


@pytest.fixture
def db_engine(temp_db_path):
    """Provide a fresh DatabaseEngine instance."""
    from db_engine import DatabaseEngine
    engine = DatabaseEngine(db_path=temp_db_path)
    yield engine
    engine.close()


@pytest.fixture
def cache_manager():
    """Provide a fresh CacheManager instance."""
    from cache_manager import CacheManager
    cm = CacheManager(max_size=100, default_ttl=60)
    yield cm
    cm.shutdown()


@pytest.fixture
def module_cache(cache_manager):
    """Provide a fresh ModuleCache instance."""
    from cache_manager import ModuleCache
    return ModuleCache(cache_manager)


@pytest.fixture
def knowledge_base(db_engine):
    """Provide a seeded KnowledgeBase instance."""
    from knowledge_base import KnowledgeBase
    kb = KnowledgeBase(db_engine=db_engine)
    kb.seed()
    yield kb


@pytest.fixture
def state_machine():
    """Provide a fresh ConversationStateMachine instance."""
    from conversation_state import ConversationStateMachine
    return ConversationStateMachine(max_history=5)


@pytest.fixture
def scheduler(temp_db_path):
    """Provide a fresh TaskScheduler instance."""
    from scheduler import TaskScheduler
    sched = TaskScheduler(db_path=temp_db_path)
    yield sched
    if sched.is_running():
        sched.stop()


@pytest.fixture
def brain():
    """Provide a fresh OmegaBrain instance."""
    from core_brain import OmegaBrain
    return OmegaBrain(max_history=4)
