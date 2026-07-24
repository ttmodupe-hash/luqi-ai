"""Tests for ConversationStore, DocumentStore, CapabilityStore."""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from web_core.db.connection import ConnectionPool
from web_core.db.conversations import ConversationStore
from web_core.db.documents import DocumentStore
from web_core.db.capabilities import CapabilityStore
from web_core.models import CapabilityStatus, SandboxRunResult


class TestConversationStore(unittest.TestCase):
    def setUp(self):
        self.db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.pool = ConnectionPool(self.db.name)
        self.store = ConversationStore(self.pool)

    def tearDown(self):
        self.db.close()
        os.unlink(self.db.name)

    def test_save_and_retrieve(self):
        self.store.save("user", "Hello", "test-sess")
        history = self.store.get_recent("test-sess")
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].role, "user")
        self.assertEqual(history[0].content, "Hello")

    def test_multiple_sessions(self):
        self.store.save("user", "A", "sess-1")
        self.store.save("user", "B", "sess-2")
        sessions = self.store.get_all_sessions()
        self.assertEqual(len(sessions), 2)

    def test_clear_session(self):
        self.store.save("user", "X", "clear-test")
        self.store.clear_session("clear-test")
        self.assertEqual(len(self.store.get_recent("clear-test")), 0)

    def test_count(self):
        self.store.save("user", "A")
        self.store.save("assistant", "B")
        self.assertEqual(self.store.count(), 2)


class TestDocumentStore(unittest.TestCase):
    def setUp(self):
        self.db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.pool = ConnectionPool(self.db.name)
        self.store = DocumentStore(self.pool)

    def tearDown(self):
        self.db.close()
        os.unlink(self.db.name)

    def test_save_and_get(self):
        doc_id = self.store.save_document("test.txt", ".txt", "Hello content", "/tmp/test.txt")
        self.assertGreater(doc_id, 0)
        docs = self.store.get_all()
        self.assertEqual(len(docs), 1)

    def test_sandbox_run(self):
        result = SandboxRunResult("test.py", 0, "output", "", 100)
        run_id = self.store.log_sandbox_run(result)
        self.assertGreater(run_id, 0)
        runs = self.store.get_sandbox_runs()
        self.assertEqual(len(runs), 1)


class TestCapabilityStore(unittest.TestCase):
    def setUp(self):
        self.db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.pool = ConnectionPool(self.db.name)
        self.store = CapabilityStore(self.pool)

    def tearDown(self):
        self.db.close()
        os.unlink(self.db.name)

    def test_seed_data(self):
        caps = self.store.list_all()
        self.assertGreater(len(caps), 60)

    def test_count_active(self):
        active = self.store.count_active()
        self.assertGreater(active, 0)

    def test_filter_by_category(self):
        core = self.store.get_by_category("core")
        self.assertGreater(len(core), 0)
        for c in core:
            self.assertEqual(c.category, "core")

    def test_filter_by_status(self):
        planned = self.store.get_by_status(CapabilityStatus.PLANNED)
        self.assertGreaterEqual(len(planned), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
