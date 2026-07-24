"""Tests for DocumentEngine, VoiceEngine, YoutubeEngine, WealthEngine."""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from web_core.engines.document import DocumentEngine, PythonParser, TextParser
from web_core.engines.voice import VoiceEngine
from web_core.engines.youtube import YoutubeEngine
from web_core.engines.wealth import WealthEngine


class TestDocumentEngine(unittest.TestCase):
    def setUp(self):
        self.sandbox = tempfile.mkdtemp()
        self.engine = DocumentEngine(Path(self.sandbox))

    def test_supported_extensions(self):
        exts = self.engine.supported_extensions()
        self.assertIn(".pdf", exts)
        self.assertIn(".txt", exts)
        self.assertIn(".py", exts)

    def test_parse_text(self):
        f = Path(self.sandbox) / "test.txt"
        f.write_text("Hello world")
        result = self.engine.parse(f)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["content"], "Hello world")

    def test_parse_python(self):
        f = Path(self.sandbox) / "test.py"
        f.write_text("def hello(): pass\nclass Foo: pass")
        result = self.engine.parse(f)
        self.assertEqual(result["status"], "ok")
        self.assertIn("hello", result["content"])
        self.assertIn("Foo", result["content"])

    def test_file_not_found(self):
        result = self.engine.parse("/nonexistent/file.txt")
        self.assertEqual(result["status"], "error")

    def test_unsupported_format(self):
        f = Path(self.sandbox) / "test.xyz"
        f.write_text("data")
        result = self.engine.parse(f)
        self.assertEqual(result["status"], "error")


class TestPythonParser(unittest.TestCase):
    def test_parse(self):
        p = PythonParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("def add(a, b): return a + b\nclass Calculator: pass")
            f.flush()
            result = p.parse(Path(f.name))
            self.assertIn("add", result)
            self.assertIn("Calculator", result)
        os.unlink(f.name)


class TestTextParser(unittest.TestCase):
    def test_parse(self):
        p = TextParser()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("Hello world")
            f.flush()
            result = p.parse(Path(f.name))
            self.assertEqual(result, "Hello world")
        os.unlink(f.name)


class TestVoiceEngine(unittest.TestCase):
    def test_accent_map(self):
        accents = VoiceEngine().supported_accents()
        self.assertIn("american", accents)
        self.assertIn("nigerian", accents)
        self.assertIn("british", accents)

    def test_providers_not_available_without_deps(self):
        v = VoiceEngine()
        # These will be False in test environment without gTTS/SpeechRecognition
        self.assertIsInstance(v.tts_available, bool)
        self.assertIsInstance(v.stt_available, bool)


class TestYoutubeEngine(unittest.TestCase):
    def setUp(self):
        self.engine = YoutubeEngine()

    def test_campaign_structure(self):
        campaign = self.engine.generate_campaign("tech", "beginners", 5)
        self.assertEqual(campaign.niche, "tech")
        self.assertEqual(campaign.target_audience, "beginners")
        self.assertEqual(len(campaign.videos), 5)
        self.assertGreater(len(campaign.content_pillars), 0)

    def test_script_outline(self):
        outline = self.engine.generate_script_outline("Python", 10)
        self.assertEqual(outline.topic, "Python")
        self.assertEqual(outline.total_duration, 10)
        self.assertGreater(len(outline.segments), 0)

    def test_thumbnail_prompt(self):
        prompt = self.engine.generate_thumbnail_prompt("Python Tips")
        self.assertIn("Python Tips", prompt)
        self.assertIn("1280x720", prompt)


class TestWealthEngine(unittest.TestCase):
    def setUp(self):
        self.engine = WealthEngine()

    def test_funnel_structure(self):
        funnel = self.engine.generate_funnel("tech", 10000, "videos")
        self.assertEqual(funnel.niche, "tech")
        self.assertGreater(funnel.total_yearly_revenue, 0)
        self.assertGreater(len(funnel.tiers), 0)

    def test_sponsors(self):
        sponsors = self.engine.find_sponsors("tech", 50000)
        self.assertEqual(sponsors.niche, "tech")
        self.assertGreater(len(sponsors.potential_sponsors), 0)
        self.assertGreater(sponsors.estimated_sponsorship_per_video, 0)

    def test_pricing(self):
        tiers = self.engine.create_pricing("AI Course", ["Videos", "Code", "Community", "Certificate"])
        self.assertEqual(len(tiers), 3)
        self.assertEqual(tiers[0].tier_name, "basic")
        self.assertEqual(tiers[2].tier_name, "premium")


if __name__ == "__main__":
    unittest.main(verbosity=2)
