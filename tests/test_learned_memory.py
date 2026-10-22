"""Offline persistence regressions; no provider calls or production storage."""
import concurrent.futures
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from checkpoint_store import CheckpointPersistenceError
from memory_manager import CrewAIUnifiedMemory


def record(directory, index):
    return CrewAIUnifiedMemory(directory).record_learned_fact(
        "entity", f"subject-{index}", "has", "fixture", "test", "agent")


class LearnedMemoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = self.temp.name

    def test_concurrent_processes_and_restart_preserve_all_facts(self):
        observer = CrewAIUnifiedMemory(self.root)
        with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
            saved = list(pool.map(record, [self.root] * 24, range(24)))
        recovered = observer.query_facts()
        self.assertEqual({f['fact_id'] for f in saved}, {f['fact_id'] for f in recovered})
        self.assertEqual(len(recovered), 24)
        self.assertEqual(len(CrewAIUnifiedMemory(self.root).facts), 24)
        journal = Path(self.root, 'fact_journal', 'learned_facts.jsonl')
        self.assertEqual(journal.stat().st_mode & 0o777, 0o600)
        self.assertEqual(journal.parent.stat().st_mode & 0o777, 0o700)

    def test_failed_save_never_appears_in_memory(self):
        memory = CrewAIUnifiedMemory(self.root)
        with patch.object(memory._store, 'save', side_effect=CheckpointPersistenceError('failed')):
            with self.assertRaises(CheckpointPersistenceError):
                memory.record_learned_fact('entity', 'secret', 'has', 'value', 'task', 'agent')
        self.assertEqual(memory.facts, [])

    def test_corruption_is_preserved_and_blocks_writes(self):
        record(self.root, 1)
        journal = Path(self.root, 'fact_journal', 'learned_facts.jsonl')
        with journal.open('ab') as stream:
            stream.write(b'{torn')
        before = journal.read_bytes()
        with self.assertRaises(CheckpointPersistenceError):
            record(self.root, 2)
        self.assertEqual(journal.read_bytes(), before)

    def test_detached_results_cannot_mutate_memory(self):
        saved = record(self.root, 1)
        saved['subject'] = 'forged'
        memory = CrewAIUnifiedMemory(self.root)
        results = memory.query_facts()
        results[0]['subject'] = 'also forged'
        self.assertEqual(memory.query_facts(search_term='subject-1')[0]['subject'], 'subject-1')
        self.assertEqual(memory.query_facts(search_term='forged'), [])

    def test_legacy_private_file_preserved_and_combined_with_journal(self):
        legacy_fact = record(self.root + '/seed', 0)
        legacy = Path(self.root, 'unified_memory.json')
        legacy.write_text(json.dumps([legacy_fact]))
        legacy.chmod(0o600)
        before = legacy.read_bytes()
        record(self.root, 1)
        self.assertEqual(len(CrewAIUnifiedMemory(self.root).facts), 2)
        self.assertEqual(legacy.read_bytes(), before)

    def test_invalid_legacy_file_is_not_treated_as_empty(self):
        legacy = Path(self.root, 'unified_memory.json')
        for content in ('{broken', '{}', '[{"subject":"secret"}]'):
            legacy.write_text(content)
            legacy.chmod(0o600)
            with self.assertRaises(CheckpointPersistenceError) as caught:
                CrewAIUnifiedMemory(self.root)
            self.assertNotIn('secret', str(caught.exception))
            self.assertEqual(legacy.read_text(), content)

    def test_legacy_symlinks_and_public_files_rejected(self):
        target = Path(self.root, 'target.json')
        target.write_text('[]')
        legacy = Path(self.root, 'unified_memory.json')
        legacy.symlink_to(target)
        with self.assertRaises(CheckpointPersistenceError):
            CrewAIUnifiedMemory(self.root)
        legacy.unlink()
        legacy.write_text('[]')
        legacy.chmod(0o644)
        with self.assertRaises(CheckpointPersistenceError):
            CrewAIUnifiedMemory(self.root)

    def test_separate_storage_directories_do_not_share_facts(self):
        record(self.root + '/first', 1)
        self.assertEqual(CrewAIUnifiedMemory(self.root + '/second').facts, [])

    def test_flush_failure_is_reported_not_acknowledged(self):
        with patch('checkpoint_store.os.fsync', side_effect=OSError('private details')):
            with self.assertRaises(CheckpointPersistenceError) as caught:
                record(self.root, 1)
        self.assertNotIn('private details', str(caught.exception))

    def test_invalid_fact_rejected_without_persisting(self):
        memory = CrewAIUnifiedMemory(self.root)
        for confidence in (True, -1, 2, float('nan'), float('inf'), 'high'):
            with self.assertRaises(ValueError):
                memory.record_learned_fact('entity', 'subject', 'is', 'value', 'task', 'agent', confidence)
        self.assertEqual(memory.facts, [])


if __name__ == '__main__':
    unittest.main()
