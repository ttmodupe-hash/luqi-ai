#!/usr/bin/env python3
"""Run all web_core tests."""

import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

loader = unittest.TestLoader()
suite = unittest.TestSuite()

# Discover all test files in this directory
for test_file in sorted(Path(__file__).parent.glob("test_*.py")):
    module_name = f"web_core.tests.{test_file.stem}"
    try:
        suite.addTests(loader.discover(str(test_file.parent), pattern=test_file.name))
    except Exception as e:
        print(f"Warning: Could not load {test_file.name}: {e}")

runner = unittest.TextTestRunner(verbosity=2)
result = runner.run(suite)

sys.exit(0 if result.wasSuccessful() else 1)
