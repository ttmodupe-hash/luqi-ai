"""Tests for SystemAgent (health, metrics, self-improvement)."""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from web_core.db.connection import ConnectionPool
from web_core.db.conversations import ConversationStore
from web_core.agents.system import SystemAgent


class TestSystemAgent(unittest.TestCase):
    def setUp(self):
        self.db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.pool = ConnectionPool(self.db.name)
        self.agent = SystemAgent(self.pool, Path(__file__).parent.parent, "test-1.0")
        # Seed some data
        conv = ConversationStore(self.pool)
        conv.save("user", "Hello", "test")
        conv.save("assistant", "Hi", "test")

    def tearDown(self):
        self.db.close()
        os.unlink(self.db.name)

    def test_health(self):
        h = self.agent.health()
        self.assertEqual(h.status, "healthy")
        self.assertEqual(h.version, "test-1.0")
        self.assertEqual(h.conversations, 2)

    def test_prometheus_metrics(self):
        metrics = self.agent.metrics_prometheus()
        self.assertIn("luqi_conversations_total", metrics)
        self.assertIn("luqi_version", metrics)

    def test_analyze_file(self):
        # Create a test Python file
        test_file = Path(self.db.name).parent / "test_script.py"
        test_file.write_text("def add(a, b):\n    return a + b\n\nclass Calculator:\n    pass")
        result = self.agent.analyze_file(test_file)
        self.assertEqual(result["functions"], 1)
        self.assertEqual(result["classes"], 1)
        self.assertGreater(result["lines"], 0)
        test_file.unlink()

    def test_analyze_project(self):
        results = self.agent.analyze_project()
        self.assertIsInstance(results, list)
        # Should find at least the files in web_core/
        self.assertGreater(len(results), 0)

    def test_generate_improvement_report(self):
        report = self.agent.generate_improvement_report()
        self.assertIn("Self-Improvement Report", report)
        self.assertIn("Files analyzed", report)

    def test_git_status(self):
        status = self.agent.git_status()
        self.assertIn("dirty", status)
        self.assertIn("changed_files", status)

    def test_last_commit(self):
        commit = self.agent.last_commit()
        self.assertIsInstance(commit, str)


if __name__ == "__main__":
    unittest.main(verbosity=2)
