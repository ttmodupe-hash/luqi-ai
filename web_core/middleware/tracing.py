"""
web_core.middleware.tracing - Request tracing and correlation.

Provides per-request trace contexts, timing spans, and ASGI middleware
for distributed request tracing with unique request IDs.
"""

from __future__ import annotations

import contextvars
import logging
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from functools import wraps
from typing import Any, Callable, Dict, Iterator, List, Optional, TypeVar, Union

logger = logging.getLogger("luqi.middleware.tracing")

F = TypeVar("F", bound=Callable[..., Any])

# Context variable holding the current trace for async-safe propagation
_trace_ctx: contextvars.ContextVar[Optional["TraceContext"]] = contextvars.ContextVar(
    "trace_ctx", default=None
)


# -- Span ---------------------------------------------------------------------

@dataclass
class Span:
    """A named timing segment within a trace."""

    name: str
    start_time: float = field(default_factory=time.monotonic)
    end_time: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration_ms(self) -> float:
        """Elapsed time in milliseconds."""
        end = self.end_time if self.end_time else time.monotonic()
        return round((end - self.start_time) * 1000, 2)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "duration_ms": self.duration_ms,
            "metadata": self.metadata,
        }


# -- Trace context ------------------------------------------------------------

@dataclass
class TraceContext:
    """Per-request trace data container."""

    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    parent_id: Optional[str] = None
    start_time: float = field(default_factory=time.monotonic)
    spans: List[Span] = field(default_factory=list)
    metadata: Dict[str, str] = field(default_factory=dict)

    def add_span(
        self, name: str, duration_ms: float = 0.0, metadata: Optional[Dict[str, Any]] = None
    ) -> Span:
        """Add a completed span to this trace."""
        span = Span(
            name=name,
            start_time=time.monotonic() - (duration_ms / 1000.0),
            end_time=time.monotonic(),
            metadata=metadata or {},
        )
        self.spans.append(span)
        return span

    @property
    def total_duration_ms(self) -> float:
        """Total elapsed time since trace started."""
        return round((time.monotonic() - self.start_time) * 1000, 2)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "parent_id": self.parent_id,
            "duration_ms": self.total_duration_ms,
            "spans": [s.to_dict() for s in self.spans],
            "metadata": self.metadata,
        }


# -- Helpers ------------------------------------------------------------------

def get_current_trace(request: Any = None) -> Optional[TraceContext]:
    """Get the current trace context.

    Prefers *request.state.trace* when a FastAPI request is available,
    falls back to the context variable.
    """
    if request is not None:
        state = getattr(request, "state", None)
        if state is not None:
            trace = getattr(state, "trace", None)
            if trace is not None:
                return trace
    return _trace_ctx.get()


@contextmanager
def trace_span(name: str, metadata: Optional[Dict[str, Any]] = None) -> Iterator[Span]:
    """Context manager that records a timed span on the current trace.

    Usage::

        with trace_span("db_query", {"table": "users"}):
            rows = db.fetchall(...)
    """
    span = Span(name=name, metadata=metadata or {})
    try:
        yield span
    finally:
        span.end_time = time.monotonic()
        trace = _trace_ctx.get()
        if trace is not None:
            trace.spans.append(span)


def trace_span_decorator(
    name: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None
) -> Callable[[F], F]:
    """Decorator that records a timed span around a function call.

    Usage::

        @trace_span_decorator("expensive_op")
        def expensive_op():
            ...
    """
    def decorator(func: F) -> F:
        span_name = name or func.__name__

        if asyncio_iscoroutine(func):
            @wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                with trace_span(span_name, metadata or {}):
                    return await func(*args, **kwargs)
            return async_wrapper  # type: ignore[return-value]
        else:
            @wraps(func)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                with trace_span(span_name, metadata or {}):
                    return func(*args, **kwargs)
            return sync_wrapper  # type: ignore[return-value]

    return decorator


def asyncio_iscoroutine(func: Callable[..., Any]) -> bool:
    """Check if *func* is an async function without importing asyncio."""
    import asyncio
    return asyncio.iscoroutinefunction(func)


# -- Logging integration ------------------------------------------------------

def configure_logging_with_trace() -> None:
    """Configure logging to prepend ``[req-<id>]`` to log messages
    when inside a trace context.
    """
    class TraceFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            trace = _trace_ctx.get()
            if trace is not None:
                record.msg = f"[req-{trace.request_id[:8]}] {record.msg}"
            return super().format(record)

    handler = logging.StreamHandler()
    handler.setFormatter(TraceFormatter("%(levelname)s: %(message)s"))
    root = logging.getLogger("luqi")
    if not root.handlers:
        root.addHandler(handler)


# -- Middleware ---------------------------------------------------------------

DEFAULT_SKIP_PATHS = {"/health", "/ready", "/metrics"}


class TracingMiddleware:
    """ASGI middleware that adds request tracing to every HTTP request.

    * Generates or propagates ``X-Request-ID``
    * Measures request duration
    * Skips tracing for static files and health endpoints
    """

    def __init__(
        self,
        app: Any,
        skip_paths: Optional[set] = None,
    ):
        self.app = app
        self.skip_paths = skip_paths or DEFAULT_SKIP_PATHS

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if any(path.startswith(p) for p in self.skip_paths) or "/static/" in path:
            await self.app(scope, receive, send)
            return

        # Read or generate request ID
        headers = dict(scope.get("headers", []))
        request_id = ""
        for k, v in headers.items():
            if k.decode().lower() == "x-request-id":
                request_id = v.decode()
                break
        if not request_id:
            request_id = str(uuid.uuid4())

        parent_id = None
        for k, v in headers.items():
            if k.decode().lower() == "x-parent-request-id":
                parent_id = v.decode()
                break

        trace = TraceContext(request_id=request_id, parent_id=parent_id)
        token = _trace_ctx.set(trace)

        # Store trace in scope state for route handlers
        scope.setdefault("state", {})
        scope["state"]["trace"] = trace

        logger.info("Request %s %s started (id=%s)", scope.get("method"), path, request_id[:8])

        # Capture response status
        status_code = 200

        async def wrapped_send(message: Any) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
                headers = list(message.get("headers", []))
                headers.append([b"X-Request-ID", request_id.encode()])
                headers.append([b"X-Trace-Duration-Ms", str(trace.total_duration_ms).encode()])
                headers.append([b"X-Request-Path", path.encode()])
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, wrapped_send)
        finally:
            duration = trace.total_duration_ms
            logger.info(
                "Request %s %s completed in %.2fms (status=%d)",
                scope.get("method"), path, duration, status_code,
            )
            _trace_ctx.reset(token)


# -- FastAPI integration ------------------------------------------------------

def add_tracing_middleware(app: Any, skip_paths: Optional[set] = None) -> None:
    """Add tracing middleware to a FastAPI application.

    Usage::

        from fastapi import FastAPI
        app = FastAPI()
        add_tracing_middleware(app, skip_paths={"/health", "/ready"})
    """
    from starlette.middleware.base import BaseHTTPMiddleware

    class _TracingMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Any, call_next: Any) -> Any:
            path = request.url.path
            if any(path.startswith(p) for p in (skip_paths or DEFAULT_SKIP_PATHS)):
                return await call_next(request)

            request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
            parent_id = request.headers.get("X-Parent-Request-ID")
            trace = TraceContext(request_id=request_id, parent_id=parent_id)
            token = _trace_ctx.set(trace)
            request.state.trace = trace

            start = time.monotonic()
            response = await call_next(request)
            duration = round((time.monotonic() - start) * 1000, 2)

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Trace-Duration-Ms"] = str(duration)
            response.headers["X-Request-Path"] = path

            _trace_ctx.reset(token)
            return response

    app.add_middleware(_TracingMiddleware)
