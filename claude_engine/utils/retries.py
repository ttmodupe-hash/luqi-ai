"""Exponential backoff retry helpers (SPEC sections 2 and 4).

Delays grow as ``base * 2 ** attempt`` with +/-10% uniform jitter to avoid
thundering-herd retries. Both synchronous and asynchronous variants are
provided; the async twin never blocks the event loop.
"""

from __future__ import annotations

import asyncio
import random
import time
from collections.abc import Callable
from typing import Any, TypeVar

T = TypeVar("T")

DEFAULT_JITTER = 0.1  # +/-10% jitter, per SPEC section 4


def compute_delay(attempt: int, base: float, jitter: float = DEFAULT_JITTER) -> float:
    """Compute the backoff delay for a given retry attempt.

    The delay is ``base * 2 ** attempt`` with uniform random jitter of
    +/- ``jitter`` (as a fraction) applied, so the result lies in
    ``[base * 2**attempt * (1 - jitter), base * 2**attempt * (1 + jitter)]``.

    Args:
        attempt: Zero-based retry attempt index (0 = first retry).
        base: Exponential base delay in seconds.
        jitter: Jitter fraction; 0.1 means +/-10%.

    Returns:
        The delay in seconds.
    """
    delay = base * (2 ** attempt)
    spread = delay * jitter
    return random.uniform(delay - spread, delay + spread)


def retry_with_backoff(
    fn: Callable[[], T],
    max_retries: int,
    base: float,
    retryable_exceptions: tuple[type[BaseException], ...],
) -> T:
    """Call ``fn`` synchronously, retrying retryable failures with backoff.

    Args:
        fn: Zero-argument callable to invoke.
        max_retries: Number of retries after the initial call (so at most
            ``max_retries + 1`` total attempts).
        base: Exponential base delay in seconds.
        retryable_exceptions: Exception types that trigger a retry. Any
            other exception propagates immediately.

    Returns:
        The return value of ``fn`` on its first success.

    Raises:
        BaseException: The last retryable exception once retries are
            exhausted, or a non-retryable exception immediately.
    """
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except retryable_exceptions:
            if attempt >= max_retries:
                raise
            time.sleep(compute_delay(attempt, base))
    raise AssertionError("unreachable")  # pragma: no cover


async def aretry_with_backoff(
    fn: Callable[[], Any],
    max_retries: int,
    base: float,
    retryable_exceptions: tuple[type[BaseException], ...],
) -> Any:
    """Async twin of :func:`retry_with_backoff`.

    ``fn`` may be a synchronous callable or an async callable returning an
    awaitable; awaitables are awaited. Sleeps use :func:`asyncio.sleep`.

    Args:
        fn: Zero-argument callable (sync or async) to invoke.
        max_retries: Number of retries after the initial call.
        base: Exponential base delay in seconds.
        retryable_exceptions: Exception types that trigger a retry.

    Returns:
        The (awaited) return value of ``fn`` on its first success.

    Raises:
        BaseException: The last retryable exception once retries are
            exhausted, or a non-retryable exception immediately.
    """
    import inspect

    for attempt in range(max_retries + 1):
        try:
            result = fn()
            if inspect.isawaitable(result):
                result = await result
            return result
        except retryable_exceptions:
            if attempt >= max_retries:
                raise
            await asyncio.sleep(compute_delay(attempt, base))
    raise AssertionError("unreachable")  # pragma: no cover
