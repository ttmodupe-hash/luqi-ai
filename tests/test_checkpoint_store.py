"""Checkpoint recovery and filesystem attack regressions, using isolated files."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os

import pytest

from checkpoint_store import CheckpointPersistenceError, LocalCheckpointStore
from memory_manager import LangGraphCheckpointer


@pytest.fixture
def store(tmp_path):
    return LocalCheckpointStore(tmp_path / "checkpoints")


@pytest.mark.parametrize("thread_id", ["", "../outside", "/tmp/outside", "a/b", "a\\b", "..", ".", "a\x00b", "x" * 129, None, 123])
def test_invalid_thread_ids_never_touch_disk(store, tmp_path, thread_id):
    for operation in (lambda: store.save(thread_id, "node", {}), lambda: store.history(thread_id)):
        with pytest.raises(ValueError):
            operation()
    assert list(tmp_path.iterdir()) == []


def test_symlink_file_cannot_redirect_reads_or_writes(store, tmp_path):
    outside = tmp_path / "outside"
    outside.write_text("original-private-data")
    store.directory.mkdir()
    (store.directory / "session.jsonl").symlink_to(outside)
    with pytest.raises(CheckpointPersistenceError):
        store.save("session", "node", {})
    with pytest.raises(CheckpointPersistenceError):
        store.history("session")
    assert outside.read_text() == "original-private-data"


def test_symlink_checkpoint_directory_is_rejected(tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    linked = tmp_path / "checkpoints"
    linked.symlink_to(outside, target_is_directory=True)
    with pytest.raises(CheckpointPersistenceError):
        LocalCheckpointStore(linked).save("session", "node", {})
    assert list(outside.iterdir()) == []


def test_restart_recovers_history_and_continues_sequence(store):
    store.save("session", "first", {"language": "zu"})
    recovered = LocalCheckpointStore(store.directory)
    assert recovered.history("session")[0]["channel_values"] == {"language": "zu"}
    assert recovered.save("session", "second", {})["step"] == 2
    assert len(store.history("session")) == 2
    assert (store.directory.stat().st_mode & 0o777) == 0o700
    assert ((store.directory / "session.jsonl").stat().st_mode & 0o777) == 0o600


def test_external_mutations_do_not_rewrite_stored_snapshots(store):
    payload = {"nested": ["original"]}
    saved = store.save("session", "node", payload)
    payload["nested"].append("input-mutated")
    saved["channel_values"]["nested"].append("return-mutated")
    history = store.history("session")
    history[0]["channel_values"]["nested"].append("history-mutated")
    assert store.history("session")[0]["channel_values"] == {"nested": ["original"]}


@pytest.mark.parametrize("damage", ["checksum", "truncated", "sequence", "thread"])
def test_damaged_history_is_not_silently_overwritten(store, damage):
    store.save("session", "node", {"original": True})
    path = store.directory / "session.jsonl"
    snapshot = json.loads(path.read_text())
    if damage == "checksum":
        snapshot["channel_values"] = {"changed": True}
    elif damage == "sequence":
        snapshot["step"] = 10
    elif damage == "thread":
        snapshot["thread_id"] = "another-session"
    text = json.dumps(snapshot) + "\n"
    if damage == "truncated":
        text = text[:-1]
    path.write_text(text)
    for operation in (lambda: store.history("session"), lambda: store.save("session", "new", {})):
        with pytest.raises(CheckpointPersistenceError):
            operation()
        assert path.read_text() == text


def test_concurrent_store_instances_allocate_distinct_steps(store):
    def save(index):
        return LocalCheckpointStore(store.directory).save("session", "node", {"index": index})
    with ThreadPoolExecutor(max_workers=8) as pool:
        snapshots = list(pool.map(save, range(24)))
    assert sorted(s["step"] for s in snapshots) == list(range(1, 25))
    assert len({s["checkpoint_id"] for s in snapshots}) == 24
    assert len(store.history("session")) == 24


def test_legacy_checkpoints_still_load(store):
    store.directory.mkdir()
    snapshot = {"checkpoint_id": "chk_session_step_1", "thread_id": "session", "step": 1,
                "node_name": "legacy", "channel_values": {}, "tool_calls": [],
                "state_diff": {}, "timestamp": "2026-10-22T10:00:00"}
    snapshot["checksum"] = hashlib.sha256(json.dumps(snapshot, default=str).encode()).hexdigest()[:16]
    (store.directory / "session.jsonl").write_text(json.dumps(snapshot) + "\n")
    assert store.history("session")[0]["node_name"] == "legacy"
    assert store.save("session", "new", {})["step"] == 2


def test_failed_sync_does_not_claim_saved_checkpoint(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(LangGraphCheckpointer, "_setup_connection", lambda self: None)
    checkpointer = LangGraphCheckpointer(archive_path=str(tmp_path))
    def broken_sync(fd):
        raise OSError("private-password-and-path")
    monkeypatch.setattr(os, "fsync", broken_sync)
    with pytest.raises(CheckpointPersistenceError) as error:
        checkpointer.save_checkpoint("session", "node", {})
    assert "private-password" not in str(error.value)
    assert checkpointer.in_memory_checkpoints == {}
    assert "private-password" not in capsys.readouterr().out


def test_unknown_history_is_empty_without_creating_files(store):
    assert store.history("missing") == []
    assert not store.directory.exists()
