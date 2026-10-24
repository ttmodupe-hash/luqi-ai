#!/usr/bin/env python3
"""Restore a trusted single-database dump in a NEW, network-isolated local container.

Never fetches a backup, uses a source database credential, or restores to a URL.
Standard library only. Linux with the local /var/run/docker.sock is required.
Reports import/readability, NOT source completeness or production launch approval.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import zlib
import stat
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone

MAX_COMPRESSED = 128 * 1024 * 1024
MAX_EXPANDED = 512 * 1024 * 1024
IMAGE = 'mysql:8.4'
SCHEMA = 'luqi_restore'
# Enabled runtime tables only; optional Omega is not a launch prerequisite.
TABLES = ('users', 'companion_conversations', 'companion_messages',
          'companion_memories', 'offline_sync_queue', 'auth_attempt_windows',
          'ai_pilot_monthly_spend', 'ai_pilot_daily_user_usage')


class DrillError(Exception):
    """Only fixed, public-safe messages should reach the terminal."""


def unpack_backup(path: Path, expected_hash: str, target: Path) -> tuple[str, int]:
    if not re.fullmatch(r'[0-9a-fA-F]{64}', expected_hash):
        raise DrillError('Expected SHA-256 must be 64 hexadecimal characters.')
    # Open once, reject symlinks, and use the same descriptor for hash and gzip.
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, 'rb') as source:
            info = os.fstat(source.fileno())
            if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid()
                    or info.st_mode & 0o077 or not 0 < info.st_size <= MAX_COMPRESSED):
                raise DrillError('Backup must be an owned private regular file within the size limit.')
            digest = hashlib.sha256()
            for chunk in iter(lambda: source.read(1024 * 1024), b''):
                digest.update(chunk)
            if digest.hexdigest() != expected_hash.lower():
                raise DrillError('Backup checksum mismatch; no database was created.')
            source.seek(0)
            size = 0
            with gzip.GzipFile(fileobj=source) as archive, target.open('xb') as output:
                os.chmod(target, 0o600)
                header = b''
                for chunk in iter(lambda: archive.read(1024 * 1024), b''):
                    size += len(chunk)
                    if size > MAX_EXPANDED:
                        raise DrillError('Expanded backup exceeds the restore-drill limit.')
                    if len(header) < 65536:
                        header += chunk[:65536 - len(header)]
                    output.write(chunk)
            if not size or not header.startswith(b'-- MySQL dump '):
                raise DrillError('Expected a nonempty mysqldump SQL gzip, not a volume snapshot.')
            if not re.search(rb'-- Server version\s+8\.4\.', header):
                raise DrillError('This drill supports MySQL 8.4 exports only; review other versions separately.')
            # Verify that the source did not change while it was being copied.
            source.seek(0)
            after = hashlib.sha256()
            for chunk in iter(lambda: source.read(1024 * 1024), b''):
                after.update(chunk)
            if after.digest() != digest.digest():
                raise DrillError('Backup changed during validation; no database was created.')
            return digest.hexdigest(), size
    except DrillError:
        raise
    except (OSError, EOFError, gzip.BadGzipFile, zlib.error):
        raise DrillError('Backup could not be safely opened or decompressed.') from None


class LocalDocker:
    def __init__(self, work: Path):
        executable = shutil.which('docker')
        if not executable:
            raise DrillError('Local Docker CLI is required; no restore was attempted.')
        # Never inherit a remote Docker context or a registry/source credential.
        self.command = [executable, '--host', 'unix:///var/run/docker.sock',
                        '--config', str(work / 'docker-config')]
        self.env = {'PATH': os.defpath, 'HOME': str(work), 'LANG': 'C.UTF-8'}

    def run(self, args: list[str], *, stdin=None, output=None, capture=False,
            timeout=30, allow_failure=False) -> str:
        # Import output is discarded; only fixed metadata queries are captured.
        try:
            result = subprocess.run(self.command + args, env=self.env, stdin=stdin,
                                    stdout=subprocess.PIPE if capture else (output or subprocess.DEVNULL),
                                    stderr=subprocess.DEVNULL, timeout=timeout, check=False)
        except (OSError, subprocess.TimeoutExpired):
            raise DrillError('Local Docker operation failed or timed out; diagnostics withheld.') from None
        if result.returncode and not allow_failure:
            raise DrillError('Local Docker operation failed; private diagnostics withheld.')
        if result.returncode:
            return ''
        return result.stdout.decode('utf-8', errors='strict').strip() if capture else ''


def container_arguments(name: str, image_id: str) -> list[str]:
    if not re.fullmatch(r'luqi-restore-[0-9a-f]{32}', name):
        raise DrillError('Invalid disposable container identity.')
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', image_id):
        raise DrillError('The preloaded MySQL image identity is invalid.')
    return ['run', '--detach', '--pull=never', '--name', name,
            '--label', 'luqi.restore-drill=isolated', '--network=none',
            '--read-only', '--user=mysql', '--cap-drop=ALL',
            '--security-opt=no-new-privileges', '--pids-limit=256',
            '--cpus=1', '--memory=2g', '--memory-swap=2g', '--log-driver=none',
            '--tmpfs', '/var/lib/mysql:rw,nosuid,nodev,noexec,size=1g,mode=1777',
            '--tmpfs', '/var/run/mysqld:rw,nosuid,nodev,noexec,size=16m,mode=1777',
            '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777',
            '--env', 'MYSQL_ALLOW_EMPTY_PASSWORD=yes', '--env', f'MYSQL_DATABASE={SCHEMA}',
            '--env', 'MYSQL_INITDB_SKIP_TZINFO=yes', image_id,
            '--skip-networking', '--skip-log-bin', '--event-scheduler=DISABLED',
            '--local-infile=OFF', '--secure-file-priv=NULL']


def mysql_arguments(name: str) -> list[str]:
    # --binary-mode disables local client commands (notably system/source) for
    # noninteractive input. No --force: any SQL error must fail the drill.
    return ['exec', '--interactive', name, 'mysql', '--no-defaults',
            '--protocol=socket', '--socket=/var/run/mysqld/mysqld.sock',
            '--user=root', '--binary-mode', '--local-infile=0',
            '--batch', '--skip-column-names', SCHEMA]


def verify_isolation(observation: dict) -> None:
    host = observation['HostConfig']
    mounts = observation.get('Mounts', [])
    if (host.get('NetworkMode') != 'none' or not host.get('ReadonlyRootfs')
            or host.get('Privileged') or host.get('PortBindings') or host.get('Binds')
            or host.get('VolumesFrom') or host.get('Devices')
            or observation['Config'].get('User') != 'mysql'
            or any(m.get('Type') != 'tmpfs' for m in mounts)
            or '/var/lib/mysql' not in host.get('Tmpfs', {})
            or host.get('LogConfig', {}).get('Type') != 'none'):
        raise DrillError('Disposable container isolation did not match the required policy.')


def execute_drill(driver: LocalDocker, sql: Path, work: Path) -> dict:
    image_id = driver.run(['image', 'inspect', '--format', '{{.Id}}', IMAGE], capture=True)
    name = 'luqi-restore-' + uuid.uuid4().hex
    args = container_arguments(name, image_id)
    created = False
    started = time.monotonic()
    try:
        # Mark ownership before the call so failed/ambiguous starts also clean up.
        created = True
        driver.run(args, timeout=45)
        observation = json.loads(driver.run(['inspect', name], capture=True))[0]
        verify_isolation(observation)
        ready_by = time.monotonic() + 120
        while time.monotonic() < ready_by:
            # PID 1 must be the final server, not its temporary bootstrap server.
            ready = driver.run(['exec', name, 'sh', '-c',
                'test "$(cat /proc/1/comm)" = mysqld && '
                'mysqladmin --no-defaults --protocol=socket '
                '--socket=/var/run/mysqld/mysqld.sock --user=root ping'],
                capture=True, allow_failure=True, timeout=5)
            if ready == 'mysqld is alive':
                break
            time.sleep(2)
        else:
            raise DrillError('Isolated MySQL did not become ready; no production service was touched.')
        with sql.open('rb') as source:
            driver.run(mysql_arguments(name), stdin=source, timeout=180)
        # Require the enabled tables and transactional engines. Only identifiers
        # from this fixed source file are interpolated; no customer text is read.
        table_sql = ('SELECT TABLE_NAME, ENGINE FROM information_schema.tables '
                     f"WHERE TABLE_SCHEMA='{SCHEMA}' AND TABLE_TYPE='BASE TABLE'")
        raw = driver.run(mysql_arguments(name) + ['--execute', table_sql], capture=True)
        engines = dict(line.split('\t', 1) for line in raw.splitlines())
        if any(engines.get(table) != 'InnoDB' for table in TABLES):
            raise DrillError('Restored backup is missing an enabled transactional runtime table.')
        # Read all restored rows via mysqldump, to a private local temporary file.
        # No SQL, email, password hash or note content is printed or uploaded.
        redump = work / 'roundtrip.sql'
        with redump.open('xb') as output:
            os.chmod(redump, 0o600)
            driver.run(['exec', name, 'mysqldump', '--no-defaults', '--protocol=socket',
                        '--socket=/var/run/mysqld/mysqld.sock', '--user=root',
                        '--single-transaction', '--quick', '--routines', '--triggers',
                        '--no-tablespaces', '--set-gtid-purged=OFF', SCHEMA],
                       output=output, timeout=180)
        if redump.stat().st_size == 0:
            raise DrillError('Restored database could not be read back.')
        result = {'result': 'isolated_import_and_readback_passed',
                  'mysql_image_id': image_id, 'enabled_runtime_tables': len(TABLES),
                  'duration_seconds': round(time.monotonic() - started, 2),
                  'source_data_equivalence_verified': False, 'launch_approved': False}
    finally:
        if created:
            # No success evidence is returned if removal cannot be confirmed.
            driver.run(['rm', '--force', '--volumes', name], timeout=30)
            remaining = driver.run(['ps', '--all', '--quiet', '--filter', f'name=^/{name}$'], capture=True)
            if remaining:
                raise DrillError('Disposable container cleanup was not confirmed; inspect the local Docker host.')
    result['temporary_container_removed'] = True
    return result


def write_report(path: Path, report: dict) -> None:
    # Never overwrite an older proof or follow a report symlink.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump(report, output, indent=2)
        output.write('\n')


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path, required=True)
    parser.add_argument('--sha256', required=True, help='Independently recorded hash of the gzip export.')
    parser.add_argument('--source-kind', choices=['fixture', 'production-derived'], required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--execute', action='store_true', help='Actually create and remove a local temporary container.')
    args = parser.parse_args(argv)
    try:
        if args.source_kind == 'production-derived' and (os.environ.get('CI') or os.environ.get('GITHUB_ACTIONS')):
            raise DrillError('Production-derived backups must not be restored on CI runners.')
        if args.report.exists() or args.report.is_symlink():
            raise DrillError('Report already exists; choose a new private report path.')
        # Operator must use an approved encrypted workstation/tmp directory.
        # Unlinking temporary files is cleanup, not a secure-erasure guarantee.
        with tempfile.TemporaryDirectory(prefix='luqi-restore-private-') as temp:
            work = Path(temp)
            digest, size = unpack_backup(args.backup, args.sha256, work / 'input.sql')
            report = {'format': 'luqi.restore-drill.v1',
                      'recorded_at': datetime.now(timezone.utc).isoformat(),
                      'source_kind_operator_declared': args.source_kind,
                      'backup_sha256': digest, 'expanded_bytes': size,
                      'result': 'preflight_only', 'launch_approved': False}
            if args.execute:
                report.update(execute_drill(LocalDocker(work), work / 'input.sql', work))
            write_report(args.report, report)
        print('PASS: isolated restore evidence recorded; no launch clearance.' if args.execute else
              'PRECHECK ONLY: checksum and format validated; no restore performed.')
        return 0
    except (DrillError, OSError, ValueError, KeyError):
        # Fixed summary: do not print raw SQL, local paths, client or daemon errors.
        print('FAIL: recovery evidence not completed. Check prerequisites and local cleanup; private diagnostics withheld.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    def interrupted(_signal, _frame):
        raise DrillError('Interrupted; cleanup required.')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    raise SystemExit(main())
