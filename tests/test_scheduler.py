"""Tests for scheduler."""

import pytest
from scheduler import Scheduler


def test_add_job():
    scheduler = Scheduler()
    job = scheduler.add_job("test", lambda: "done", "daily")
    assert job["name"] == "test"


def test_list_jobs():
    scheduler = Scheduler()
    scheduler.add_job("test1", lambda: "done", "daily")
    jobs = scheduler.list_jobs()
    assert len(jobs) == 1


def test_run_job():
    scheduler = Scheduler()
    scheduler.add_job("test", lambda: "done", "daily")
    result = scheduler.run_job(1)
    assert result["status"] == "success"
