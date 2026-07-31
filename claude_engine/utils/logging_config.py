"""Structured logging configuration for claude_engine (SPEC section 5).

Uses structlog with contextvars so per-request metadata (e.g. the
request id) is automatically attached to every log event emitted while
handling that request.
"""

from __future__ import annotations

import logging
import sys
import uuid

import structlog


def configure_logging(log_level: str = "INFO") -> None:
    """Configure structlog and stdlib logging for the process.

    Emits JSON log lines to stdout with ISO-8601 timestamps, log level,
    logger name, rendered stack info and exception info, plus any
    contextvars-bound metadata (such as ``request_id``).

    Args:
        log_level: Minimum stdlib level name, e.g. ``"INFO"`` or ``"DEBUG"``.
    """
    level = getattr(logging, str(log_level).upper(), logging.INFO)

    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level)

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def bind_request_id() -> str:
    """Generate a request id and bind it to the structlog contextvars context.

    Returns:
        A fresh request id: the first 12 hex chars of a uuid4.
    """
    request_id = uuid.uuid4().hex[:12]
    structlog.contextvars.bind_contextvars(request_id=request_id)
    return request_id


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger bound to the given name.

    Args:
        name: Logger name, typically ``__name__`` of the caller.

    Returns:
        A bound structlog logger.
    """
    return structlog.get_logger(name)
