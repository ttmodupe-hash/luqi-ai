#!/usr/bin/env python3
"""
Luqi AI LUQI Agent Test Suite
==============================
Tests for the LUQI unified agent: chat, voice, memory, tools, and scheduler.
"""

import unittest
import sys
import os
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))


class TestLuqiAgent(unittest.TestCase):
    """Test LUQI agent module."""

    def test_agent_chat_structure(self):
        from backend.luqi_unified import agent_chat
        result = agent_chat("Hello")
        self.assertEqual(result["status"], "success")
        self.assertIn("message", result)
        self.assertIn("session_id", result)
        self.assertIn("version", result)

    def test_agent_stats(self):
        from backend.luqi_unified import agent_stats
        result = agent_stats()
        self.assertEqual(result["status"], "success")
        self.assertIn("total_messages", result)

    def test_agent_list_tools(self):
        from backend.luqi_unified import agent_list_tools
        result = agent_list_tools()
        self.assertEqual(result["status"], "success")
        self.assertIn("tools", result)

    def test_web_search(self):
        from backend.luqi_unified import web_search
        result = web_search("test query")
        self.assertEqual(result["status"], "success")

    def test_run_code(self):
        from backend.luqi_unified import run_code
        result = run_code("print('hello')")
        self.assertEqual(result["status"], "success")

    def test_memory_search(self):
        from backend.luqi_unified import agent_memory_search
        result = agent_memory_search("test")
        self.assertEqual(result["status"], "success")

    def test_memory_facts(self):
        from backend.luqi_unified import agent_memory_facts
        result = agent_memory_facts()
        self.assertEqual(result["status"], "success")

    def test_store_fact(self):
        from backend.luqi_unified import agent_store_fact
        result = agent_store_fact("test_key", "test_value")
        self.assertEqual(result["status"], "success")

    def test_clear_session(self):
        from backend.luqi_unified import agent_clear_session
        result = agent_clear_session()
        self.assertEqual(result["status"], "success")

    def test_agent_speak(self):
        from backend.luqi_unified import agent_speak
        result = agent_speak("Hello")
        self.assertEqual(result["status"], "success")


class TestMemoryEngine(unittest.TestCase):
    """Test MemoryEngine."""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(self.db_fd)

    def tearDown(self):
        os.unlink(self.db_path)

    def test_save_and_get_recent(self):
        from backend.luqi_unified import MemoryEngine
        mem = MemoryEngine(db_path=self.db_path)
        mem.save_message("user", "Hello", session_id="test")
        ctx = mem.get_recent(session_id="test")
        self.assertEqual(len(ctx), 1)
        self.assertEqual(ctx[0]["role"], "user")

    def test_store_and_get_facts(self):
        from backend.luqi_unified import MemoryEngine
        mem = MemoryEngine(db_path=self.db_path)
        mem.store_fact("key1", "value1")
        facts = mem.get_facts()
        self.assertTrue(any(f["key"] == "key1" for f in facts))

    def test_search(self):
        from backend.luqi_unified import MemoryEngine
        mem = MemoryEngine(db_path=self.db_path)
        mem.save_message("user", "test message", session_id="test")
        results = mem.search("test")
        self.assertGreaterEqual(len(results), 1)

    def test_stats(self):
        from backend.luqi_unified import MemoryEngine
        mem = MemoryEngine(db_path=self.db_path)
        stats = mem.get_stats()
        self.assertIn("total_messages", stats)

    def test_clear_session(self):
        from backend.luqi_unified import MemoryEngine
        mem = MemoryEngine(db_path=self.db_path)
        mem.save_message("user", "Hello", session_id="test")
        mem.clear_session("test")
        ctx = mem.get_recent(session_id="test")
        self.assertEqual(len(ctx), 0)


class TestToolRegistry(unittest.TestCase):
    """Test ToolRegistry."""

    def test_register_and_list(self):
        from backend.luqi_unified import ToolRegistry
        reg = ToolRegistry()
        def fn(x): return f"ok: {x}"
        reg.register("test", fn, {"description": "d", "parameters": {"type": "object", "properties": {}}})
        self.assertEqual(len(reg.list()), 1)

    def test_invoke(self):
        from backend.luqi_unified import ToolRegistry
        reg = ToolRegistry()
        def fn(x): return f"ok: {x}"
        reg.register("test", fn, {"description": "d", "parameters": {"type": "object", "properties": {}}})
        result = reg.invoke("test", {"x": "hi"})
        self.assertIn("ok", result)

    def test_invoke_missing(self):
        from backend.luqi_unified import ToolRegistry
        reg = ToolRegistry()
        result = reg.invoke("missing", {})
        self.assertIn("not found", result)


class TestVoiceEngine(unittest.TestCase):
    """Test VoiceEngine."""

    def test_clean_for_speech(self):
        from backend.luqi_unified import VoiceEngine
        ve = VoiceEngine()
        c = ve._clean_for_speech("**bold** `code` https://x.com")
        self.assertNotIn("**", c)
        self.assertNotIn("https://", c)

    def test_status(self):
        from backend.luqi_unified import VoiceEngine
        ve = VoiceEngine()
        s = ve.status()
        self.assertIn("stt_available", s)
        self.assertIn("tts_available", s)


class TestBuiltinTools(unittest.TestCase):
    """Test built-in tools."""

    def test_search_web_no_deps(self):
        from backend.luqi_unified import search_web
        result = search_web("test")
        self.assertIsInstance(result, str)

    def test_open_application_error(self):
        from backend.luqi_unified import open_application
        result = open_application("nonexistent_app_xyz")
        self.assertIsInstance(result, str)

    def test_system_info(self):
        from backend.luqi_unified import system_info
        result = system_info()
        self.assertIn("platform", result)

    def test_run_code(self):
        from backend.luqi_unified import run_code
        result = run_code("print(2+2)")
        self.assertIn("4", result)

    def test_run_code_error(self):
        from backend.luqi_unified import run_code
        result = run_code("print(undefined)")
        self.assertIn("error", result.lower())


if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestLuqiAgent))
    suite.addTests(loader.loadTestsFromTestCase(TestMemoryEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestToolRegistry))
    suite.addTests(loader.loadTestsFromTestCase(TestVoiceEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestBuiltinTools))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
