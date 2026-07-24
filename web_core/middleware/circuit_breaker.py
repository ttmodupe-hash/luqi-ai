"""
web_core.middleware.circuit_breaker - Circuit breaker pattern for resilient
external service calls.

Provides per-service circuit breakers with CLOSED/OPEN/HALF_OPEN states,
a global registry, decorator support, and FastAPI exception handlers.
"""

from __future__ import annotations

import asyncio
import functools
import logging
import threading
import time
from enum import Enum
from typing import Any, Callable, Dict, Optional, TypeVar

logger = logging.getLogger("luqi.middleware.circuit_breaker")

F = TypeVar("F", bound=Callable[..., Any])


# -- Exceptions ---------------------------------------------------------------

class CircuitBreakerOpen(Exception):
    """Raised when a circuit breaker is OPEN (fast-failing)."""

    def __init__(self, name: str, retry_after: int = 30):
        self.name = name
        self.retry_after = retry_after
        super().__init__(f"Circuit breaker '{name}' is OPEN. Retry after {retry_after}s")


# -- State machine ------------------------------------------------------------

class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Failing fast
    HALF_OPEN = "half_open" # Testing recovery


# -- Circuit breaker ----------------------------------------------------------

class CircuitBreaker:
    """Per-service circuit breaker implementing the state-machine pattern.

    State transitions::

        CLOSED ──[failures >= threshold]──> OPEN
        OPEN ──[timeout expires]──> HALF_OPEN
        HALF_OPEN ──[success]──> CLOSED
        HALF_OPEN ──[failure]──> OPEN
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self._state = CircuitState.CLOSED
        self._failures = 0
        self._successes = 0
        self._state_changes = 0
        self._last_failure_time: Optional[float] = None
        self._half_open_calls = 0
        self._lock = threading.RLock()

    # -- public API ------------------------------------------------------------

    @property
    def state(self) -> CircuitState:
        """Current circuit state (auto-transitions OPEN→HALF_OPEN on timeout)."""
        with self._lock:
            if self._state is CircuitState.OPEN:
                elapsed = time.monotonic() - (self._last_failure_time or 0)
                if elapsed >= self.recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_calls = 0
                    self._successes = 0
                    logger.info("Circuit %s: OPEN → HALF_OPEN", self.name)
            return self._state

    @property
    def metrics(self) -> Dict[str, Any]:
        """Snapshot of circuit metrics."""
        with self._lock:
            return {
                "name": self.name,
                "state": self._state.value,
                "failures": self._failures,
                "successes": self._successes,
                "state_changes": self._state_changes,
                "last_failure_time": self._last_failure_time,
            }

    def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Execute *func* through the circuit breaker (sync version)."""
        current_state = self.state

        if current_state is CircuitState.OPEN:
            raise CircuitBreakerOpen(self.name, int(self.recovery_timeout))

        if current_state is CircuitState.HALF_OPEN:
            with self._lock:
                if self._half_open_calls >= self.half_open_max_calls:
                    raise CircuitBreakerOpen(self.name, int(self.recovery_timeout))
                self._half_open_calls += 1

        try:
            result = func(*args, **kwargs)
        except Exception:
            self._on_failure()
            raise

        self._on_success()
        return result

    async def async_call(
        self, func: Callable[..., Any], *args: Any, **kwargs: Any
    ) -> Any:
        """Execute *func* through the circuit breaker (async version)."""
        current_state = self.state

        if current_state is CircuitState.OPEN:
            raise CircuitBreakerOpen(self.name, int(self.recovery_timeout))

        if current_state is CircuitState.HALF_OPEN:
            with self._lock:
                if self._half_open_calls >= self.half_open_max_calls:
                    raise CircuitBreakerOpen(self.name, int(self.recovery_timeout))
                self._half_open_calls += 1

        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
        except Exception:
            self._on_failure()
            raise

        self._on_success()
        return result

    def reset(self) -> None:
        """Manually reset the circuit to CLOSED."""
        with self._lock:
            old = self._state
            self._state = CircuitState.CLOSED
            self._failures = 0
            self._successes = 0
            self._half_open_calls = 0
            if old is not CircuitState.CLOSED:
                self._state_changes += 1
                logger.info("Circuit %s: %s → CLOSED (manual reset)", self.name, old.value)

    # -- internal -------------------------------------------------------------

    def _on_success(self) -> None:
        with self._lock:
            self._successes += 1
            if self._state is CircuitState.HALF_OPEN:
                self._state = CircuitState.CLOSED
                self._failures = 0
                self._half_open_calls = 0
                self._state_changes += 1
                logger.info("Circuit %s: HALF_OPEN → CLOSED", self.name)

    def _on_failure(self) -> None:
        with self._lock:
            self._failures += 1
            self._last_failure_time = time.monotonic()
            if self._state is CircuitState.CLOSED and self._failures >= self.failure_threshold:
                self._state = CircuitState.OPEN
                self._state_changes += 1
                logger.warning(
                    "Circuit %s: CLOSED → OPEN (%d failures)", self.name, self._failures
                )
            elif self._state is CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                self._half_open_calls = 0
                self._state_changes += 1
                logger.warning("Circuit %s: HALF_OPEN → OPEN", self.name)


# -- Registry -----------------------------------------------------------------

class CircuitBreakerRegistry:
    """Thread-safe registry of named circuit breakers."""

    def __init__(self):
        self._circuits: Dict[str, CircuitBreaker] = {}
        self._lock = threading.Lock()

    def get(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
    ) -> CircuitBreaker:
        """Get or create a circuit breaker by name."""
        with self._lock:
            if name not in self._circuits:
                self._circuits[name] = CircuitBreaker(
                    name=name,
                    failure_threshold=failure_threshold,
                    recovery_timeout=recovery_timeout,
                    half_open_max_calls=half_open_max_calls,
                )
            return self._circuits[name]

    def all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Metrics snapshot for all registered circuits."""
        with self._lock:
            return {name: cb.metrics for name, cb in self._circuits.items()}

    def reset(self, name: str) -> bool:
        """Manually reset a circuit to CLOSED. Returns True if found."""
        with self._lock:
            cb = self._circuits.get(name)
            if cb:
                cb.reset()
                return True
            return False


# Global default registry used by the decorator
_default_registry = CircuitBreakerRegistry()


# -- Decorator ----------------------------------------------------------------

def circuit_breaker_decorator(
    name: str,
    fallback: Optional[Callable[..., Any]] = None,
    failure_threshold: int = 5,
    recovery_timeout: float = 30.0,
    half_open_max_calls: int = 3,
) -> Callable[[F], F]:
    """Decorator that wraps a function with a named circuit breaker.

    When the circuit is OPEN, *fallback* is returned/called instead.
    """
    def decorator(func: F) -> F:
        cb = _default_registry.get(name, failure_threshold, recovery_timeout, half_open_max_calls)

        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                try:
                    return await cb.async_call(func, *args, **kwargs)
                except CircuitBreakerOpen:
                    if fallback is not None:
                        return fallback(*args, **kwargs) if callable(fallback) else fallback
                    raise
            return async_wrapper  # type: ignore[return-value]
        else:
            @functools.wraps(func)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                try:
                    return cb.call(func, *args, **kwargs)
                except CircuitBreakerOpen:
                    if fallback is not None:
                        return fallback(*args, **kwargs) if callable(fallback) else fallback
                    raise
            return sync_wrapper  # type: ignore[return-value]

    return decorator


# -- FastAPI integration ------------------------------------------------------

def add_circuit_breaker_handlers(app: Any) -> None:
    """Register exception handler for CircuitBreakerOpen on a FastAPI app.

    Usage::

        from fastapi import FastAPI
        app = FastAPI()
        add_circuit_breaker_handlers(app)
    """
    from fastapi import Request
    from fastapi.responses import JSONResponse

    @app.exception_handler(CircuitBreakerOpen)
    async def _handler(request: Request, exc: CircuitBreakerOpen) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            headers={"Retry-After": str(exc.retry_after)},
            content={
                "detail": str(exc),
                "circuit": exc.name,
                "retry_after": exc.retry_after,
            },
        )
