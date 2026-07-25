"""
Tests for scheduler module.
"""

import pytest
import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scheduler import Scheduler, Job


class TestScheduler:
    """Test suite for Scheduler."""

    def test_add_job(self):
        """Test adding a scheduled job."""
        scheduler = Scheduler()
        executed = []
        
        def task():
            executed.append(True)
        
        job_id = scheduler.add_job(task, interval_seconds=0.1)
        assert job_id is not None

    def test_remove_job(self):
        """Test removing a scheduled job."""
        scheduler = Scheduler()
        
        def task():
            pass
        
        job_id = scheduler.add_job(task, interval_seconds=10)
        result = scheduler.remove_job(job_id)
        assert result is True

    def test_remove_nonexistent(self):
        """Test removing a job that doesn't exist."""
        scheduler = Scheduler()
        result = scheduler.remove_job("nonexistent")
        assert result is False

    def test_job_execution(self):
        """Test that scheduled jobs actually execute."""
        scheduler = Scheduler()
        executed = []
        
        def task():
            executed.append(True)
        
        scheduler.add_job(task, interval_seconds=0.1, max_runs=1)
        scheduler.start()
        time.sleep(0.3)
        scheduler.stop()
        
        assert len(executed) >= 1

    def test_cron_expression(self):
        """Test cron expression parsing."""
        scheduler = Scheduler()
        
        def task():
            pass
        
        # Every minute
        job_id = scheduler.add_cron_job(task, cron="* * * * *")
        assert job_id is not None

    def test_job_status(self):
        """Test getting job status."""
        scheduler = Scheduler()
        
        def task():
            pass
        
        job_id = scheduler.add_job(task, interval_seconds=60)
        status = scheduler.get_job_status(job_id)
        assert status is not None
        assert "running" in status or "active" in status or "pending" in status

    def test_max_runs(self):
        """Test job with max runs limit."""
        scheduler = Scheduler()
        count = [0]
        
        def task():
            count[0] += 1
        
        scheduler.add_job(task, interval_seconds=0.05, max_runs=3)
        scheduler.start()
        time.sleep(0.5)
        scheduler.stop()
        
        assert count[0] <= 3

    def test_scheduler_start_stop(self):
        """Test scheduler start and stop."""
        scheduler = Scheduler()
        scheduler.start()
        assert scheduler.is_running()
        scheduler.stop()
        assert not scheduler.is_running()