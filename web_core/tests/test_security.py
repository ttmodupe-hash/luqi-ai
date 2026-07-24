"""Tests for AuthManager, TokenBucketRateLimiter, SqliteAuditLogger."""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from web_core.db.connection import ConnectionPool
from web_core.security.auth import AuthManager
from web_core.security.rate_limit import TokenBucketRateLimiter
from web_core.security.audit import SqliteAuditLogger


class TestAuthManager(unittest.TestCase):
    def setUp(self):
        self.db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.pool = ConnectionPool(self.db.name)
        self.auth = AuthManager(self.pool, admin_key="admin-secret")

    def tearDown(self):
        self.db.close()
        os.unlink(self.db.name)

    def test_create_key(self):
        key = self.auth.create_key("test-key")
        self.assertTrue(key.startswith("sk-luqi-"))

    def test_validate_valid_key(self):
        key = self.auth.create_key("valid-test")
        info = self.auth.validate(key)
        self.assertIsNotNone(info)
        self.assertEqual(info["name"], "valid-test")
        self.assertFalse(info["is_admin"])

    def test_validate_invalid_key(self):
        self.assertIsNone(self.auth.validate("invalid-key"))

    def test_admin_key_from_env(self):
        self.assertTrue(self.auth.is_admin("admin-secret"))

    def test_non_admin_key(self):
        key = self.auth.create_key("regular")
        self.assertFalse(self.auth.is_admin(key))

    def test_admin_key_creation(self):
        key = self.auth.create_key("admin-test", is_admin=True)
        self.assertTrue(self.auth.is_admin(key))

    def test_list_keys(self):
        self.auth.create_key("key-1")
        self.auth.create_key("key-2")
        keys = self.auth.list_keys()
        self.assertEqual(len(keys), 2)

    def test_request_count_increment(self):
        key = self.auth.create_key("counter")
        self.auth.validate(key)
        self.auth.validate(key)
        info = self.auth.validate(key)
        self.assertEqual(info["request_count"], 3)


class TestTokenBucketRateLimiter(unittest.TestCase):
    def setUp(self):
        self.db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.pool = ConnectionPool(self.db.name)
        self.rl = TokenBucketRateLimiter(self.pool, max_tokens=5.0, refill_rate=1.0)

    def tearDown(self):
        self.db.close()
        os.unlink(self.db.name)

    def test_allow_first_request(self):
        self.assertTrue(self.rl.check("key-1"))

    def test_block_after_exhausted(self):
        for _ in range(5):
            self.rl.check("key-2")
        self.assertFalse(self.rl.check("key-2"))

    def test_different_keys_independent(self):
        self.assertTrue(self.rl.check("key-a"))
        for _ in range(5):
            self.rl.check("key-b")
        self.assertTrue(self.rl.check("key-a"))  # key-a still has tokens
        self.assertFalse(self.rl.check("key-b"))  # key-b exhausted


class TestSqliteAuditLogger(unittest.TestCase):
    def setUp(self):
        self.db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.pool = ConnectionPool(self.db.name)
        self.logger = SqliteAuditLogger(self.pool)

    def tearDown(self):
        self.db.close()
        os.unlink(self.db.name)

    def test_log_request(self):
        self.logger.log("test-hash", "GET", "/api/test", 200, 15.5)
        recent = self.logger.get_recent(10)
        self.assertEqual(len(recent), 1)
        self.assertEqual(recent[0]["method"], "GET")
        self.assertEqual(recent[0]["path"], "/api/test")

    def test_log_multiple(self):
        for i in range(5):
            self.logger.log("hash", "GET", f"/api/{i}", 200, float(i))
        recent = self.logger.get_recent(10)
        self.assertEqual(len(recent), 5)

    def test_get_recent_limit(self):
        for i in range(10):
            self.logger.log("hash", "GET", f"/api/{i}", 200, 1.0)
        recent = self.logger.get_recent(3)
        self.assertEqual(len(recent), 3)


if __name__ == "__main__":
    unittest.main(verbosity=2)
