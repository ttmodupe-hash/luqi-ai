"""Offline recovery guards. No daemon, real credential, or production data."""
import contextlib
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('restore_drill', ROOT / 'scripts/verify-local-mysql-backup.py')
drill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(drill)
DUMP = b'-- MySQL dump 10.13\n-- Server version\t8.4.7\nCREATE TABLE test(id INT);\n'
IMAGE = 'sha256:' + 'a' * 64


def observation():
    return {'HostConfig': {'NetworkMode': 'none', 'ReadonlyRootfs': True,
                          'Tmpfs': {'/var/lib/mysql': 'private'},
                          'LogConfig': {'Type': 'none'}},
            'Config': {'User': 'mysql'}, 'Mounts': [{'Type': 'tmpfs'}]}


class FakeDocker:
    def __init__(self, fail=None, bad_isolation=False, missing_table=False, lingering=False):
        self.calls = []
        self.fail, self.bad_isolation = fail, bad_isolation
        self.missing_table, self.lingering = missing_table, lingering

    def run(self, args, **kwargs):
        self.calls.append((args, kwargs))
        if args[0] == self.fail:
            raise drill.DrillError('Fixed synthetic failure')
        if args[:2] == ['image', 'inspect']:
            return IMAGE
        if args[0] == 'inspect':
            data = observation()
            if self.bad_isolation:
                data['HostConfig']['NetworkMode'] = 'host'
            return json.dumps([data])
        if args[0] == 'ps':
            return 'synthetic-leftover' if self.lingering else ''
        if 'sh' in args:
            return 'mysqld is alive'
        if '--execute' in args:
            return '\n'.join(name + '\tInnoDB' for name in (drill.TABLES[:-1] if self.missing_table else drill.TABLES))
        if 'mysqldump' in args:
            kwargs['output'].write(DUMP)
        return ''


class RecoveryGuards(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.backup = self.root / 'backup.sql.gz'
        self.backup.write_bytes(gzip.compress(DUMP))
        self.backup.chmod(0o600)
        self.sha = hashlib.sha256(self.backup.read_bytes()).hexdigest()

    def unpack(self, digest=None):
        return drill.unpack_backup(self.backup, digest or self.sha, self.root / 'output.sql')

    def test_valid_private_dump_preserved(self):
        digest, size = self.unpack()
        self.assertEqual((digest, size), (self.sha, len(DUMP)))
        self.assertEqual((self.root / 'output.sql').read_bytes(), DUMP)
        self.assertEqual(stat.S_IMODE((self.root / 'output.sql').stat().st_mode), 0o600)

    def test_mismatched_checksum_refused(self):
        with self.assertRaises(drill.DrillError):
            self.unpack('0' * 64)
        self.assertFalse((self.root / 'output.sql').exists())

    def test_invalid_hash_refused(self):
        for value in ['bad', 'x' * 64, 'a' * 63]:
            with self.subTest(value=value), self.assertRaises(drill.DrillError):
                self.unpack(value)

    def test_symlink_refused(self):
        target = self.root / 'other'
        self.backup.rename(target)
        self.backup.symlink_to(target)
        with self.assertRaises(drill.DrillError):
            self.unpack()

    def test_public_file_refused(self):
        self.backup.chmod(0o644)
        with self.assertRaises(drill.DrillError):
            self.unpack()

    def test_directory_and_fifo_refused_without_blocking(self):
        self.backup.unlink()
        for kind in ['directory', 'fifo']:
            with self.subTest(kind=kind):
                self.backup.mkdir() if kind == 'directory' else os.mkfifo(self.backup, 0o600)
                with self.assertRaises(drill.DrillError):
                    self.unpack()
                self.backup.rmdir() if kind == 'directory' else self.backup.unlink()

    def test_invalid_or_truncated_gzip_refused(self):
        for data in [b'not gzip', gzip.compress(DUMP)[:-6]]:
            with self.subTest(data=data[:5]):
                self.backup.write_bytes(data)
                digest = hashlib.sha256(data).hexdigest()
                with self.assertRaises(drill.DrillError):
                    self.unpack(digest)
                (self.root / 'output.sql').unlink(missing_ok=True)

    def test_wrong_engine_version_or_empty_dump_refused(self):
        for sql in [b'', b'-- PostgreSQL database dump\n', DUMP.replace(b'8.4.7', b'9.0.1')]:
            with self.subTest(sql=sql[:20]):
                self.backup.write_bytes(gzip.compress(sql))
                with self.assertRaises(drill.DrillError):
                    self.unpack(hashlib.sha256(self.backup.read_bytes()).hexdigest())
                (self.root / 'output.sql').unlink(missing_ok=True)

    def test_compressed_and_expanded_limits(self):
        for name in ['MAX_COMPRESSED', 'MAX_EXPANDED']:
            with self.subTest(name=name), patch.object(drill, name, 5):
                with self.assertRaises(drill.DrillError):
                    self.unpack()
                (self.root / 'output.sql').unlink(missing_ok=True)

    def test_plan_has_no_docker_execution(self):
        report = self.root / 'report.json'
        with patch.object(drill, 'LocalDocker') as driver, contextlib.redirect_stdout(io.StringIO()) as out:
            result = drill.main(['--backup', str(self.backup), '--sha256', self.sha,
                                 '--source-kind', 'fixture', '--report', str(report)])
        self.assertEqual(result, 0)
        driver.assert_not_called()
        self.assertIn('no restore performed', out.getvalue())
        data = json.loads(report.read_text())
        self.assertEqual(data['result'], 'preflight_only')
        self.assertFalse(data['launch_approved'])
        self.assertEqual(stat.S_IMODE(report.stat().st_mode), 0o600)
        self.assertNotIn(str(self.backup), report.read_text())

    def test_production_source_on_ci_refused_before_read(self):
        with patch.dict(os.environ, {'CI': 'true'}), patch.object(drill, 'unpack_backup') as unpack:
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(drill.main(['--backup', 'missing', '--sha256', self.sha,
                                            '--source-kind', 'production-derived', '--report', str(self.root / 'r')]), 1)
        unpack.assert_not_called()

    def test_report_cannot_overwrite_or_follow_symlink(self):
        report = self.root / 'report'
        report.write_text('keep')
        with self.assertRaises(FileExistsError):
            drill.write_report(report, {})
        report.unlink()
        report.symlink_to(self.backup)
        with self.assertRaises(FileExistsError):
            drill.write_report(report, {})
        self.assertEqual(hashlib.sha256(self.backup.read_bytes()).hexdigest(), self.sha)

    def test_container_policy_never_mounts_or_publishes(self):
        args = drill.container_arguments('luqi-restore-' + '1' * 32, IMAGE)
        for required in ['--network=none', '--read-only', '--user=mysql', '--cap-drop=ALL',
                         '--pull=never', '--log-driver=none', '--event-scheduler=DISABLED']:
            self.assertIn(required, args)
        self.assertTrue(all(arg not in args for arg in ['-v', '--volume', '--mount', '-p', '--publish', '--privileged']))
        self.assertNotIn('DATABASE_URL', ' '.join(args))

    def test_arbitrary_image_or_container_identity_refused(self):
        for name, image in [('production', IMAGE), ('luqi-restore-' + '1' * 32, 'mysql:latest')]:
            with self.subTest(name=name), self.assertRaises(drill.DrillError):
                drill.container_arguments(name, image)

    def test_local_daemon_and_secret_free_environment(self):
        with patch.object(drill.shutil, 'which', return_value='/usr/bin/docker'), patch.dict(os.environ, {
            'DOCKER_HOST': 'tcp://remote.invalid', 'DATABASE_URL': 'PRIVATE', 'MYSQL_PWD': 'PRIVATE',
            'AWS_SECRET_ACCESS_KEY': 'PRIVATE', 'OPENAI_API_KEY': 'PRIVATE',
        }):
            driver = drill.LocalDocker(self.root)
        self.assertEqual(driver.command[1:3], ['--host', 'unix:///var/run/docker.sock'])
        self.assertEqual(set(driver.env), {'PATH', 'HOME', 'LANG'})
        self.assertNotIn('PRIVATE', str(driver.env))

    def test_isolation_readback_denies_network_bind_volume_or_root(self):
        changes = [('NetworkMode', 'host'), ('PortBindings', {'3306': []}), ('Binds', ['/host:/data']),
                   ('Privileged', True), ('ReadonlyRootfs', False), ('VolumesFrom', ['live-db'])]
        for key, value in changes:
            data = observation()
            data['HostConfig'][key] = value
            with self.subTest(key=key), self.assertRaises(drill.DrillError):
                drill.verify_isolation(data)
        data = observation(); data['Mounts'] = [{'Type': 'volume'}]
        with self.assertRaises(drill.DrillError):
            drill.verify_isolation(data)

    def test_client_commands_and_continuing_after_errors_disabled(self):
        args = drill.mysql_arguments('synthetic')
        self.assertIn('--binary-mode', args)
        self.assertIn('--local-infile=0', args)
        self.assertNotIn('--force', args)
        self.assertFalse(any('host=' in arg for arg in args))

    def test_success_only_after_import_readback_and_cleanup(self):
        self.unpack()
        driver = FakeDocker()
        result = drill.execute_drill(driver, self.root / 'output.sql', self.root)
        self.assertEqual(result['result'], 'isolated_import_and_readback_passed')
        self.assertTrue(result['temporary_container_removed'])
        self.assertFalse(result['source_data_equivalence_verified'])
        self.assertFalse(result['launch_approved'])
        self.assertEqual([c[0][0] for c in driver.calls][-2:], ['rm', 'ps'])

    def test_failure_still_removes_only_new_container(self):
        self.unpack()
        for kwargs in [{'bad_isolation': True}, {'missing_table': True}, {'fail': 'exec'}]:
            with self.subTest(kwargs=kwargs):
                driver = FakeDocker(**kwargs)
                with self.assertRaises(drill.DrillError):
                    drill.execute_drill(driver, self.root / 'output.sql', self.root)
                removal = [c for c, _ in driver.calls if c[0] == 'rm']
                self.assertEqual(len(removal), 1)
                self.assertRegex(removal[0][-1], '^luqi-restore-[0-9a-f]{32}$')

    def test_cleanup_failure_never_returns_success(self):
        self.unpack()
        for kwargs in [{'fail': 'rm'}, {'lingering': True}]:
            with self.subTest(kwargs=kwargs):
                (self.root / 'roundtrip.sql').unlink(missing_ok=True)
                with self.assertRaises(drill.DrillError):
                    drill.execute_drill(FakeDocker(**kwargs), self.root / 'output.sql', self.root)


if __name__ == '__main__':
    unittest.main()
