"""Rate Limiter — API rate limiting and throttling."""

import json
from typing import Dict
from datetime import datetime, timedelta


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, capacity: int = 100, refill_rate: float = 1.0):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.buckets = {}

    def _get_bucket(self, key: str) -> Dict:
        if key not in self.buckets:
            self.buckets[key] = {"tokens": self.capacity, "last_update": datetime.now()}
        return self.buckets[key]

    def _refill(self, bucket: Dict):
        now = datetime.now()
        elapsed = (now - bucket["last_update"]).total_seconds()
        bucket["tokens"] = min(self.capacity, bucket["tokens"] + elapsed * self.refill_rate)
        bucket["last_update"] = now

    def allow_request(self, key: str, cost: int = 1) -> bool:
        bucket = self._get_bucket(key)
        self._refill(bucket)
        if bucket["tokens"] >= cost:
            bucket["tokens"] -= cost
            return True
        return False

    def get_status(self, key: str) -> Dict:
        bucket = self._get_bucket(key)
        self._refill(bucket)
        return {
            "key": key,
            "remaining": int(bucket["tokens"]),
            "capacity": self.capacity,
            "reset_after": int((self.capacity - bucket["tokens"]) / self.refill_rate) if self.refill_rate > 0 else 0,
        }

    def reset(self, key: str):
        if key in self.buckets:
            self.buckets[key]["tokens"] = self.capacity
            self.buckets[key]["last_update"] = datetime.now()


if __name__ == "__main__":
    limiter = RateLimiter(capacity=10, refill_rate=1)
    for i in range(12):
        allowed = limiter.allow_request("user1")
        print(f"Request {i+1}: {'Allowed' if allowed else 'Denied'}")
    print(json.dumps(limiter.get_status("user1"), indent=2))
