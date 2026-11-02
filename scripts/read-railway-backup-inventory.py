#!/usr/bin/env python3
"""Read-only Railway backup metadata for the LUQI production MySQL volume.

Requires an operator-held environment token and volume *instance* ID.
Never obtains backup bytes, sends mutations, restores SQL, or changes Railway.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import stat
import sys
import urllib.request

URL = "https://backboard.railway.com/graphql/v2"
EXPECTED = {
    "project_id": "9f627cb8-3136-4b30-89d2-32ca648a1e5f",
    "environment_id": "1e192ef3-1fa6-4684-81fc-60165c7b0e22",
    "service_id": "8094576f-f2c7-4e50-b474-69661e7c0ba8",
    "volume_id": "d02ad924-218c-4afc-a886-0cee686bc62b",
}
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")
MAX_BYTES = 128 * 1024
QUERY = """query LuqiBackupInventoryReadOnly($id: String!) {
  volumeInstance(id: $id) {
    id mountPath volume { id name } serviceInstance { serviceName }
  }
  volumeInstanceBackupList(volumeInstanceId: $id) {
    id createdAt expiresAt
  }
  volumeInstanceBackupScheduleList(volumeInstanceId: $id) {
    id cron kind retentionSeconds
  }
}"""


class InventoryGap(Exception):
    pass


def timestamp(value):
    if not isinstance(value, str) or len(value) > 45 or not re.fullmatch(
        r"\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)", value
    ):
        raise InventoryGap()
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise InventoryGap() from None
    if parsed.tzinfo is None:
        raise InventoryGap()
    return parsed.astimezone(timezone.utc)


def iso(value):
    return value.isoformat(timespec="seconds").replace("+00:00", "Z") if value else None


def summarise(payload, instance_id, observed_at):
    if not UUID.fullmatch(instance_id) or not isinstance(observed_at, datetime) or (
        observed_at.tzinfo is None or not isinstance(payload, dict) or "errors" in payload
    ):
        raise InventoryGap()
    data = payload.get("data")
    if not isinstance(data, dict):
        raise InventoryGap()
    inst = data.get("volumeInstance")
    if not isinstance(inst, dict) or inst.get("id") != instance_id or (
        not isinstance(inst.get("volume"), dict) or inst["volume"].get("id") != EXPECTED["volume_id"]
        or not isinstance(inst.get("serviceInstance"), dict)
        or inst["serviceInstance"].get("serviceName") != "MySQL"
        or inst.get("mountPath") != "/var/lib/mysql"
    ):
        raise InventoryGap()
    backups = data.get("volumeInstanceBackupList")
    schedules = data.get("volumeInstanceBackupScheduleList")
    if not isinstance(backups, list) or len(backups) > 256 or (
        not isinstance(schedules, list) or len(schedules) > 32
    ):
        raise InventoryGap()
    observed_at = observed_at.astimezone(timezone.utc)
    dates, seen = [], set()
    expirations = 0
    for backup in backups:
        if not isinstance(backup, dict) or not isinstance(backup.get("id"), str) or (
            not backup["id"] or backup["id"] in seen
        ):
            raise InventoryGap()
        seen.add(backup["id"])
        created = timestamp(backup.get("createdAt"))
        if created > observed_at:
            raise InventoryGap()
        dates.append(created)
        if backup.get("expiresAt") is not None:
            if timestamp(backup["expiresAt"]) <= created:
                raise InventoryGap()
            expirations += 1
    clean_schedules, seen = [], set()
    for schedule in schedules:
        if not isinstance(schedule, dict) or not isinstance(schedule.get("id"), str):
            raise InventoryGap()
        sid, cron, kind, retention = (
            schedule["id"], schedule.get("cron"), schedule.get("kind"),
            schedule.get("retentionSeconds"),
        )
        if not sid or sid in seen or not isinstance(cron, str) or not re.fullmatch(
            r"[A-Za-z0-9*/ ,?_-]{1,96}", cron
        ) or not isinstance(kind, str) or not re.fullmatch(
            r"[A-Za-z0-9_-]{1,64}", kind
        ) or (retention is not None and (
            type(retention) is not int or not 0 <= retention <= 20 * 365 * 86400
        )):
            raise InventoryGap()
        seen.add(sid)
        clean_schedules.append({"cron": cron, "kind": kind, "retention_seconds": retention})
    latest = max(dates) if dates else None
    return {
        "format": "luqi.railway.backup-inventory.v1",
        "origin": "railway_graphql_read_only",
        "observed_at_utc": iso(observed_at),
        "expected_scope": EXPECTED,
        "scope_matched": True,
        "backup_count": len(dates),
        "latest_backup_utc": iso(latest),
        "oldest_backup_utc": iso(min(dates)) if dates else None,
        "latest_backup_age_hours": round((observed_at - latest).total_seconds() / 3600, 2)
        if latest else None,
        "expiry_metadata_count": expirations,
        "schedules": clean_schedules,
        "backup_contents_verified": False,
        "production_derived_isolated_restore_verified": False,
        "source_equivalence_verified": False,
        "rpo_rto_approved": False,
        "paid_launch_approved": False,
    }


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise InventoryGap()


def query_railway(instance_id, token, project_token=False):
    if not UUID.fullmatch(instance_id) or not isinstance(token, str) or (
        not 12 <= len(token) <= 4096 or "\r" in token or "\n" in token
    ):
        raise InventoryGap()
    key = "Project-Access-Token" if project_token else "Authorization"
    auth = token if project_token else "Bearer " + token
    req = urllib.request.Request(
        URL, method="POST",
        data=json.dumps({"query": QUERY, "variables": {"id": instance_id}}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json", key: auth},
    )
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=12) as response:
            if response.status != 200:
                raise InventoryGap()
            length = response.headers.get("Content-Length")
            if length and (not length.isdigit() or int(length) > MAX_BYTES):
                raise InventoryGap()
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise InventoryGap()
        return json.loads(body.decode("utf-8", errors="strict"))
    except (OSError, ValueError, UnicodeError):
        raise InventoryGap() from None


def private_report(path, result):
    parent = path.parent
    if parent.is_symlink() or not parent.is_dir():
        raise InventoryGap()
    info = parent.stat()
    if info.st_uid != os.geteuid() or info.st_mode & 0o077:
        raise InventoryGap()
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as output:
        json.dump(result, output, indent=2, sort_keys=True)
        output.write("\n")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--volume-instance-id", required=True)
    parser.add_argument("--auth-mode", required=True, choices=("project", "account-or-workspace"))
    parser.add_argument("--private-report", type=Path)
    args = parser.parse_args(argv)
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):
        print("REFUSED: authenticated inventory runs only on the operator's private machine.", file=sys.stderr)
        return 1
    try:
        token = os.environ.get("RAILWAY_TOKEN" if args.auth_mode == "project" else "RAILWAY_API_TOKEN", "")
        observed = datetime.now(timezone.utc)
        evidence = summarise(
            query_railway(args.volume_instance_id, token, args.auth_mode == "project"),
            args.volume_instance_id, observed,
        )
        if args.private_report:
            private_report(args.private_report, evidence)
        print("BACKUP INVENTORY ONLY: " + str(evidence["backup_count"]) +
              " listed backups, " + str(len(evidence["schedules"])) +
              " schedules, latest " + str(evidence["latest_backup_utc"]) +
              ". Production-derived restore UNVERIFIED; launch NOT approved.")
        return 0
    except (InventoryGap, OSError, ValueError):
        print("MONITORING GAP: the scoped backup inventory could not be verified; no change made.",
              file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
