"""Exercise backup orchestration with local fake clients; never contact a database."""
import gzip
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "backup.sh"
CLIENT = r'''
import json, os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
with open(os.environ["CALL_LOG"], "a") as out:
    out.write(json.dumps([name, sys.argv[1:]]) + "\n")
if os.environ.get("FAIL_CLIENT") == name:
    print(os.environ["DB_PASSWORD"], file=sys.stderr)
    sys.exit(1)
if name in ("mysqldump", "pg_dump"):
    if os.environ.get("EMPTY_DUMP") != "true":
        print("CREATE TABLE fixture (id INT);")
elif name == "redis-cli":
    if os.environ.get("EMPTY_REDIS") != "true":
        pathlib.Path(sys.argv[sys.argv.index("--rdb") + 1]).write_bytes(b"REDIS0011fixture")
'''


class BackupScriptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        for name in ("mysqldump", "pg_dump", "redis-cli", "aws"):
            client = self.bin / name
            client.write_text(f"#!{sys.executable}\n" + CLIENT)
            client.chmod(0o700)
        self.dest = self.root / "backups"
        self.calls = self.root / "calls.jsonl"
        self.env = {
            "PATH": f"{self.bin}:{os.environ['PATH']}",
            "BACKUP_DIR": str(self.dest), "DB_ENGINE": "mysql",
            "DB_NAME": "luqi_fixture", "DB_PASSWORD": "test-secret-do-not-log",
            "REDIS_PASSWORD": "redis-test-secret", "CALL_LOG": str(self.calls),
            "BACKUP_REDIS": "false",
        }

    def tearDown(self):
        self.temp.cleanup()

    def run_backup(self, **extra):
        result = subprocess.run(["bash", str(SCRIPT)], env={**self.env, **extra},
                                capture_output=True, text=True, timeout=15)
        self.assertNotIn(self.env["DB_PASSWORD"], result.stdout + result.stderr)
        self.assertNotIn(self.env["REDIS_PASSWORD"], result.stdout + result.stderr)
        if self.calls.exists():
            calls = self.calls.read_text()
            self.assertNotIn(self.env["DB_PASSWORD"], calls)
            self.assertNotIn(self.env["REDIS_PASSWORD"], calls)
        self.assertFalse(list(self.dest.glob(".incomplete.*")))
        return result

    def test_mysql_export_is_private_and_contains_sql(self):
        result = self.run_backup()
        self.assertEqual(result.returncode, 0, result.stderr)
        files = list(self.dest.glob("mysql_*.sql.gz"))
        self.assertEqual(len(files), 1)
        self.assertIn("CREATE TABLE fixture", gzip.decompress(files[0].read_bytes()).decode())
        self.assertEqual(files[0].stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.dest.stat().st_mode & 0o777, 0o700)
        args = json.loads(self.calls.read_text().splitlines()[0])[1]
        self.assertIn("--single-transaction", args)
        self.assertNotIn("--databases", args)  # restore must select an isolated target

    def test_postgres_and_redis_are_both_exported_and_uploaded(self):
        result = self.run_backup(DB_ENGINE="postgres", BACKUP_REDIS="true",
                                 S3_BUCKET="s3://fixture/backups")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(list(self.dest.glob("postgres_*.sql.gz"))), 1)
        self.assertEqual(len(list(self.dest.glob("redis_*.rdb"))), 1)
        calls = [json.loads(line) for line in self.calls.read_text().splitlines()]
        uploads = [args for name, args in calls if name == "aws"]
        self.assertEqual(len(uploads), 2)
        self.assertFalse(any("BGSAVE" in args for _, args in calls))

    def test_failed_export_or_upload_preserves_existing_backups(self):
        self.dest.mkdir(mode=0o700)
        previous = self.dest / "mysql_luqi_fixture_old.sql.gz"
        previous.write_bytes(b"previous-backup")
        old = time.time() - 60 * 86400
        os.utime(previous, (old, old))
        for client in ("mysqldump", "redis-cli", "aws"):
            with self.subTest(client=client):
                result = self.run_backup(FAIL_CLIENT=client, BACKUP_REDIS="true",
                                         S3_BUCKET="s3://fixture/backups")
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn("Backup export completed", result.stdout)
                self.assertEqual(previous.read_bytes(), b"previous-backup")
                self.assertEqual(list(self.dest.iterdir()), [previous])

    def test_empty_dump_and_missing_redis_snapshot_fail(self):
        for extra in ({"EMPTY_DUMP": "true"},
                      {"BACKUP_REDIS": "true", "EMPTY_REDIS": "true"}):
            with self.subTest(extra=extra):
                result = self.run_backup(**extra)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(list(self.dest.iterdir()), [])

    def test_retention_does_not_delete_other_databases(self):
        self.dest.mkdir(mode=0o700)
        old = time.time() - 60 * 86400
        for name in ("mysql_luqi_fixture_old.sql.gz", "mysql_other_old.sql.gz",
                     "postgres_luqi_fixture_old.sql.gz", "redis_old.rdb"):
            file = self.dest / name
            file.write_bytes(b"fixture")
            os.utime(file, (old, old))
        self.assertEqual(self.run_backup().returncode, 0)
        self.assertFalse((self.dest / "mysql_luqi_fixture_old.sql.gz").exists())
        for name in ("mysql_other_old.sql.gz", "postgres_luqi_fixture_old.sql.gz", "redis_old.rdb"):
            self.assertTrue((self.dest / name).exists())

    def test_bad_config_and_public_directory_fail_before_export(self):
        for extra in ({"DB_ENGINE": "invalid"}, {"RETENTION_DAYS": "0"},
                      {"DB_NAME": "../outside"}, {"BACKUP_REDIS": "maybe"}):
            with self.subTest(extra=extra):
                self.assertNotEqual(self.run_backup(**extra).returncode, 0)
                self.assertFalse(self.calls.exists())
        self.dest.mkdir(mode=0o755)
        self.dest.chmod(0o755)
        self.assertNotEqual(self.run_backup().returncode, 0)
        self.assertFalse(self.calls.exists())


if __name__ == "__main__":
    unittest.main()
