"""No-network contract acceptance for the one-shot Railway backup inventory."""
import importlib.util
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

path = Path(__file__).resolve().parents[1] / "scripts" / "read-railway-backup-inventory.py"
spec = importlib.util.spec_from_file_location("railway_inventory", path)
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)
INSTANCE = "71a06e83-68b2-495b-87ad-d1f05170aa2c"
NOW = datetime(2026, 10, 25, 14, 30, tzinfo=timezone.utc)


def fixture():
    return {"data": {
        "volumeInstance": {
            "id": INSTANCE, "mountPath": "/var/lib/mysql",
            "volume": {"id": app.EXPECTED["volume_id"], "name": "mysql-volume"},
            "serviceInstance": {"serviceName": "MySQL"},
        },
        "volumeInstanceBackupList": [
            {"id": "not-output-one", "createdAt": "2026-10-24T12:00:00Z",
             "expiresAt": "2026-10-31T12:00:00Z"},
            {"id": "not-output-two", "createdAt": "2026-10-25T12:00:00Z", "expiresAt": None},
        ],
        "volumeInstanceBackupScheduleList": [
            {"id": "not-output-schedule", "cron": "0 2 * * *",
             "kind": "DAILY", "retentionSeconds": 518400},
        ],
    }}


class OfflineTests(unittest.TestCase):
    def test_scoped_inventory_cannot_certify_recovery(self):
        r = app.summarise(fixture(), INSTANCE, NOW)
        self.assertEqual(r["backup_count"], 2)
        self.assertEqual(r["latest_backup_utc"], "2026-10-25T12:00:00Z")
        self.assertEqual(r["latest_backup_age_hours"], 2.5)
        self.assertEqual(r["schedules"][0]["retention_seconds"], 518400)
        for key in ("backup_contents_verified", "production_derived_isolated_restore_verified",
                    "source_equivalence_verified", "rpo_rto_approved", "paid_launch_approved"):
            self.assertIs(r[key], False)
        self.assertNotIn("not-output", json.dumps(r))

    def test_wrong_volume_or_older_mysql_alias_denied(self):
        for key, value in (
            ("mountPath", "/data"),
            ("serviceInstance", {"serviceName": "luqi-mysql"}),
            ("volume", {"id": "other-project", "name": "mysql-volume"}),
        ):
            x = fixture()
            x["data"]["volumeInstance"][key] = value
            with self.assertRaises(app.InventoryGap):
                app.summarise(x, INSTANCE, NOW)
        with self.assertRaises(app.InventoryGap):
            app.summarise(fixture(), "not-a-uuid", NOW)

    def test_authorization_gap_or_partial_graphql_results_denied(self):
        for x in (
            {"errors": [{"message": "Not Authorized", "traceId": "redacted"}],
             "data": fixture()["data"]},
            {"data": None},
            {},
            {"data": {"volumeInstance": None}},
        ):
            with self.assertRaises(app.InventoryGap):
                app.summarise(x, INSTANCE, NOW)

    def test_no_snapshots_is_not_restore_success(self):
        x = fixture()
        x["data"]["volumeInstanceBackupList"] = []
        x["data"]["volumeInstanceBackupScheduleList"] = []
        r = app.summarise(x, INSTANCE, NOW)
        self.assertEqual(r["backup_count"], 0)
        self.assertIsNone(r["latest_backup_utc"])
        self.assertFalse(r["paid_launch_approved"])

    def test_duplicate_future_corrupt_schedule_denied(self):
        x = fixture()
        x["data"]["volumeInstanceBackupList"].append(x["data"]["volumeInstanceBackupList"][0])
        with self.assertRaises(app.InventoryGap):
            app.summarise(x, INSTANCE, NOW)
        x = fixture()
        x["data"]["volumeInstanceBackupList"][0]["createdAt"] = "2040-01-01T00:00:00Z"
        with self.assertRaises(app.InventoryGap):
            app.summarise(x, INSTANCE, NOW)
        x = fixture()
        x["data"]["volumeInstanceBackupScheduleList"][0]["retentionSeconds"] = True
        with self.assertRaises(app.InventoryGap):
            app.summarise(x, INSTANCE, NOW)

    def test_static_readonly_graphql_contract_and_no_injected_destinations(self):
        self.assertIn("volumeInstanceBackupList", app.QUERY)
        self.assertIn("volumeInstanceBackupScheduleList", app.QUERY)
        self.assertNotIn("mutation ", app.QUERY.lower())
        self.assertEqual(app.URL, "https://backboard.railway.com/graphql/v2")
        with self.assertRaises(app.InventoryGap):
            app.query_railway(INSTANCE, "")
        with patch.dict(app.os.environ, {"CI": "true"}, clear=True):
            with patch.object(app, "query_railway") as network:
                self.assertEqual(app.main(["--volume-instance-id", INSTANCE,
                                           "--auth-mode", "account-or-workspace"]), 1)
                network.assert_not_called()

    def test_private_report_only_in_safe_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            folder.chmod(0o700)
            output = folder / "inventory.json"
            app.private_report(output, app.summarise(fixture(), INSTANCE, NOW))
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertNotIn("not-output-one", output.read_text())
            with self.assertRaises(FileExistsError):
                app.private_report(output, {})
            folder.chmod(0o755)
            with self.assertRaises(app.InventoryGap):
                app.private_report(folder / "unsafe.json", {})
            folder.chmod(0o700)


if __name__ == "__main__":
    unittest.main()
