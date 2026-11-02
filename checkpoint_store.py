"""Local JSONL checkpoint storage on a trusted POSIX filesystem.

Locks coordinate cooperating processes on the same filesystem only. This is
not a distributed queue, an authorization boundary, or a replacement for a
persistent volume and backups. Checksums detect corruption, not hostile edits.
"""
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import stat
from datetime import datetime, timezone


class CheckpointPersistenceError(RuntimeError):
    """Checkpoint could not be saved or safely recovered."""


def validate_thread_id(thread_id):
    if not isinstance(thread_id, str) or not re.fullmatch(
        r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", thread_id
    ):
        raise ValueError("Thread ID must be 1-128 ASCII letters, digits, dots, underscores or hyphens, starting with a letter or digit")


def _checksum(snapshot):
    return hashlib.sha256(json.dumps(snapshot, default=str).encode()).hexdigest()[:16]


class LocalCheckpointStore:
    def __init__(self, directory):
        self.directory = Path(directory)

    @contextmanager
    def _locked_file(self, thread_id, *, create):
        validate_thread_id(thread_id)
        directory_fd = None
        file_fd = None
        try:
            # Explicitly fail on unsupported platforms instead of silently
            # dropping symlink protection or concurrent-writer coordination.
            import fcntl
            nofollow = os.O_NOFOLLOW
            if create:
                self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
            try:
                directory_fd = os.open(self.directory, os.O_RDONLY | os.O_DIRECTORY | nofollow)
            except FileNotFoundError:
                if not create:
                    yield None
                    return
                raise
            if create:
                os.fchmod(directory_fd, 0o700)
            flags = (os.O_RDWR | os.O_CREAT | os.O_APPEND) if create else os.O_RDONLY
            try:
                file_fd = os.open(f"{thread_id}.jsonl", flags | nofollow | os.O_NONBLOCK,
                                  0o600, dir_fd=directory_fd)
            except FileNotFoundError:
                if not create:
                    yield None
                    return
                raise
            if not stat.S_ISREG(os.fstat(file_fd).st_mode):
                raise OSError("Checkpoint is not a regular file")
            fcntl.flock(file_fd, fcntl.LOCK_EX if create else fcntl.LOCK_SH)
            if create:
                os.fchmod(file_fd, 0o600)
            with os.fdopen(file_fd, "a+" if create else "r", encoding="utf-8") as stream:
                file_fd = None  # stream owns the descriptor and releases the lock
                yield stream
                if create:
                    # Persist a new directory entry before claiming success.
                    os.fsync(directory_fd)
        except (OSError, ValueError, TypeError, ImportError, AttributeError):
            # Never surface paths, connection strings, payloads or raw errors.
            raise CheckpointPersistenceError("Checkpoint storage operation failed") from None
        finally:
            if file_fd is not None:
                os.close(file_fd)
            if directory_fd is not None:
                os.close(directory_fd)

    @staticmethod
    def _read(stream, thread_id):
        if stream is None:
            return []
        stream.seek(0)
        records = []
        for line in stream:
            # A torn final record must not be silently skipped or overwritten.
            if not line.endswith("\n"):
                raise ValueError("Incomplete checkpoint record")
            snapshot = json.loads(line)
            if not isinstance(snapshot, dict):
                raise ValueError("Invalid checkpoint record")
            checksum = snapshot.pop("checksum", None)
            if (snapshot.get("thread_id") != thread_id or
                    type(snapshot.get("step")) is not int or
                    snapshot["step"] != len(records) + 1 or
                    checksum != _checksum(snapshot)):
                raise ValueError("Invalid checkpoint history")
            snapshot["checksum"] = checksum
            records.append(snapshot)
        return records

    def history(self, thread_id):
        with self._locked_file(thread_id, create=False) as stream:
            return self._read(stream, thread_id)

    def save(self, thread_id, node_name, channel_values, tool_calls=None, state_diff=None):
        with self._locked_file(thread_id, create=True) as stream:
            records = self._read(stream, thread_id)
            step = len(records) + 1
            # Round-trip into owned JSON values before checksumming or writing.
            snapshot = json.loads(json.dumps({
                "checkpoint_id": f"chk_{thread_id}_step_{step}",
                "thread_id": thread_id,
                "step": step,
                "node_name": node_name,
                "channel_values": channel_values,
                "tool_calls": tool_calls or [],
                "state_diff": state_diff or {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }, default=str, allow_nan=False))
            snapshot["checksum"] = _checksum(snapshot)
            stream.seek(0, os.SEEK_END)
            stream.write(json.dumps(snapshot) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        return snapshot
