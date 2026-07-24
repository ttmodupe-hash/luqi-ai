#!/usr/bin/env python3
"""
Luqi AI Personal AI Test Suite
===============================
Tests for the PersonalAI module: memory, tools, voice, and chat integration.
"""

import unittest
import sys
import os
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))


class TestPersonalAI(unittest.TestCase):
    """Test PersonalAI module."""

    def test_ai_chat_structure(self):
        from luqi_personal_ai import ai_chat
        result = ai_chat("Hello")
        self.assertEqual(result["status"], "success")
        self.assertIn("message", result)
        self.assertIn("session_id", result)

    def test_ai_stats(self):
        from luqi_personal_ai import ai_stats
        result = ai_stats()
        self.assertEqual(result["status"], "success")

    def test_ai_memory_search(self):
        from luqi_personal_ai import ai_memory_search
        result = ai_memory_search("test")
        self.assertEqual(result["status"], "success")

    def test_ai_store_fact(self):
        from luqi_personal_ai import ai_store_fact
        result = ai_store_fact("key", "value", "test")
        self.assertEqual(result["status"], "success")

    def test_ai_speak(self):
        from luqi_personal_ai import ai_speak
        result = ai_speak("Hello")
        self.assertEqual(result["status"], "success")


class TestPersonalMemory(unittest.TestCase):
    """Test PersonalMemory."""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(self.db_fd)

    def tearDown(self):
        os.unlink(self.db_path)

    def test_save_and_get_recent(self):
        from luqi_personal_ai import PersonalMemory
        mem = PersonalMemory(db_path=self.db_path)
        mem.save("user", "Hello", "test")
        ctx = mem.get_recent(session_id="test")
        self.assertEqual(len(ctx), 1)
        self.assertEqual(ctx[0]["role"], "user")

    def test_store_and_get_facts(self):
        from luqi_personal_ai import PersonalMemory
        mem = PersonalMemory(db_path=self.db_path)
        mem.store_fact("key1", "value1", "test")
        facts = mem.get_facts("test")
        self.assertTrue(any(f["key"] == "key1" for f in facts))

    def test_search(self):
        from luqi_personal_ai import PersonalMemory
        mem = PersonalMemory(db_path=self.db_path)
        mem.save("user", "test message", "test")
        results = mem.search("test")
        self.assertGreaterEqual(len(results), 1)

    def test_reminders(self):
        from luqi_personal_ai import PersonalMemory
        mem = PersonalMemory(db_path=self.db_path)
        mem.add_reminder("Test reminder", "2099-01-01 00:00:00")
        reminders = mem.get_pending_reminders()
        self.assertEqual(len(reminders), 0)  # Future date

    def test_stats(self):
        from luqi_personal_ai import PersonalMemory
        mem = PersonalMemory(db_path=self.db_path)
        stats = mem.get_stats()
        self.assertIn("total_messages", stats)

    def test_clear(self):
        from luqi_personal_ai import PersonalMemory
        mem = PersonalMemory(db_path=self.db_path)
        mem.save("user", "Hello", "test")
        mem.clear("test")
        ctx = mem.get_recent(session_id="test")
        self.assertEqual(len(ctx), 0)


class TestVoiceEngine(unittest.TestCase):
    """Test VoiceEngine."""

    def test_clean_for_speech(self):
        from luqi_personal_ai import VoiceEngine
        ve = VoiceEngine()
        c = ve._clean("**bold** `code` https://x.com")
        self.assertNotIn("**", c)
        self.assertNotIn("https://", c)

    def test_speak_no_text(self):
        from luqi_personal_ai import VoiceEngine
        ve = VoiceEngine()
        result = ve.speak("")
        self.assertEqual(result, "No speakable text")


class TestBuiltinTools(unittest.TestCase):
    """Test built-in tools."""

    def test_sys_info(self):
        from luqi_personal_ai import sys_info
        result = sys_info()
        self.assertIn("platform", result)

    def test_run_python(self):
        from luqi_personal_ai import run_python
        result = run_python("print(2+2)")
        self.assertIn("4", result)

    def test_run_python_error(self):
        from luqi_personal_ai import run_python
        result = run_python("print(undefined)")
        self.assertIn("error", result.lower())

    def test_search_web(self):
        from luqi_personal_ai import search_web
        result = search_web("test")
        self.assertIsInstance(result, str)


if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestPersonalAI))
    suite.addTests(loader.loadTestsFromTestCase(TestPersonalMemory))
    suite.addTests(loader.loadTestsFromTestCase(TestVoiceEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestBuiltinTools))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)