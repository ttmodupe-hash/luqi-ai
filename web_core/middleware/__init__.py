"""
LUQI AI web_core middleware package.

Exports validation, circuit breaker, and request tracing middleware
for resilient and observable HTTP request handling.
"""

from web_core.middleware.validation import (
    CHAT_SCHEMA,
    DOCUMENT_UPLOAD_SCHEMA,
    VOICE_SYNTHESIZE_SCHEMA,
    YOUTUBE_CAMPAIGN_SCHEMA,
    SchemaValidator,
    ValidationError,
    ValidationMiddleware,
    register_schema,
)
from web_core.middleware.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpen,
    CircuitBreakerRegistry,
    CircuitState,
    add_circuit_breaker_handlers,
    circuit_breaker_decorator,
)
from web_core.middleware.tracing import (
    Span,
    TraceContext,
    TracingMiddleware,
    add_tracing_middleware,
    configure_logging_with_trace,
    get_current_trace,
    trace_span,
    trace_span_decorator,
)

__all__ = [
    # Validation
    "SchemaValidator",
    "ValidationError",
    "ValidationMiddleware",
    "register_schema",
    "CHAT_SCHEMA",
    "DOCUMENT_UPLOAD_SCHEMA",
    "VOICE_SYNTHESIZE_SCHEMA",
    "YOUTUBE_CAMPAIGN_SCHEMA",
    # Circuit Breaker
    "CircuitBreaker",
    "CircuitBreakerOpen",
    "CircuitBreakerRegistry",
    "CircuitState",
    "add_circuit_breaker_handlers",
    "circuit_breaker_decorator",
    # Tracing
    "Span",
    "TraceContext",
    "TracingMiddleware",
    "add_tracing_middleware",
    "configure_logging_with_trace",
    "get_current_trace",
    "trace_span",
    "trace_span_decorator",
]
