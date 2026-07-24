"""
web_core.middleware.validation - Request body validation middleware.

Validates incoming JSON request bodies against registered schemas,
returning 400 with field-level error details on failure.
"""

from __future__ import annotations

import json
import logging
import re
import threading
from typing import Any, Callable, Dict, List, Optional, Union

logger = logging.getLogger("luqi.middleware.validation")

# -- Exception ----------------------------------------------------------------

class ValidationError(Exception):
    """Raised when request body fails schema validation."""

    def __init__(self, errors: Dict[str, str]):
        self.errors = errors
        super().__init__(f"Validation failed: {errors}")


# -- Validator ----------------------------------------------------------------

class SchemaValidator:
    """Validates a dict body against a schema definition.

    Schema format::

        {
            "field_name": {
                "type": "str",           # str | int | float | bool | list | dict
                "required": True,        # default False
                "min_length": 1,         # for str
                "max_length": 100,       # for str
                "min": 0,                # for int/float
                "max": 100,              # for int/float
                "email": True,           # for str
                "enum": ["a", "b"],      # allowed values
            }
        }
    """

    def __init__(self, schema: Dict[str, Dict[str, Any]]):
        self.schema = schema

    def validate(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """Validate *body* against the schema.  Returns the body on success,
        raises :class:`ValidationError` on failure.
        """
        if not isinstance(body, dict):
            raise ValidationError({"_body": "Expected a JSON object"})

        errors: Dict[str, str] = {}
        validated: Dict[str, Any] = {}

        for field, rules in self.schema.items():
            required = rules.get("required", False)
            value = body.get(field)

            if value is None or value == "":
                if required:
                    errors[field] = f"'{field}' is required"
                continue

            try:
                validated[field] = self._validate_field(field, value, rules)
            except ValueError as exc:
                errors[field] = str(exc)

        # Reject unexpected fields only when schema explicitly defines allowed keys
        allowed = set(self.schema.keys())
        for key in body:
            if key not in allowed and not key.startswith("_"):
                errors.setdefault(key, f"Unexpected field '{key}'")

        if errors:
            raise ValidationError(errors)
        return validated

    # -- helpers --------------------------------------------------------------

    def _validate_field(self, field: str, value: Any, rules: Dict[str, Any]) -> Any:
        ftype = rules.get("type", "str")

        if ftype == "str":
            if not isinstance(value, str):
                raise ValueError(f"'{field}' must be a string")
            if "min_length" in rules and len(value) < rules["min_length"]:
                raise ValueError(
                    f"'{field}' must be at least {rules['min_length']} characters"
                )
            if "max_length" in rules and len(value) > rules["max_length"]:
                raise ValueError(
                    f"'{field}' must be at most {rules['max_length']} characters"
                )
            if rules.get("email") and not self._is_email(value):
                raise ValueError(f"'{field}' must be a valid email")
            if "enum" in rules and value not in rules["enum"]:
                raise ValueError(
                    f"'{field}' must be one of {rules['enum']}"
                )
            return value

        if ftype == "int":
            if not isinstance(value, int) or isinstance(value, bool):
                raise ValueError(f"'{field}' must be an integer")
            self._check_range(field, value, rules)
            return value

        if ftype == "float":
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                raise ValueError(f"'{field}' must be a number")
            self._check_range(field, float(value), rules)
            return float(value)

        if ftype == "bool":
            if not isinstance(value, bool):
                raise ValueError(f"'{field}' must be a boolean")
            return value

        if ftype == "list":
            if not isinstance(value, list):
                raise ValueError(f"'{field}' must be a list")
            return value

        if ftype == "dict":
            if not isinstance(value, dict):
                raise ValueError(f"'{field}' must be an object")
            return value

        raise ValueError(f"Unknown type '{ftype}' for field '{field}'")

    @staticmethod
    def _is_email(value: str) -> bool:
        return bool(re.fullmatch(r"[^@]+@[^@]+\.[^@]+", value))

    @staticmethod
    def _check_range(field: str, value: Union[int, float], rules: Dict[str, Any]) -> None:
        if "min" in rules and value < rules["min"]:
            raise ValueError(f"'{field}' must be >= {rules['min']}")
        if "max" in rules and value > rules["max"]:
            raise ValueError(f"'{field}' must be <= {rules['max']}")


# -- Middleware ---------------------------------------------------------------

class ValidationMiddleware:
    """ASGI middleware that validates POST/PUT/PATCH JSON bodies
    against registered per-path schemas.

    Usage::

        app.add_middleware(ValidationMiddleware)
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "")
        if method not in ("POST", "PUT", "PATCH"):
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        schema = _REGISTRY.get(path)
        if schema is None:
            await self.app(scope, receive, send)
            return

        # Read and buffer the body
        body_chunks = []
        more_body = True
        while more_body:
            message = await receive()
            body_chunks.append(message.get("body", b""))
            more_body = message.get("more_body", False)

        raw_body = b"".join(body_chunks)

        if not raw_body:
            await self._send_error(send, 400, {"_body": "Request body is required"})
            return

        try:
            parsed = json.loads(raw_body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            await self._send_error(send, 400, {"_body": "Invalid JSON"})
            return

        validator = SchemaValidator(schema)
        try:
            validated = validator.validate(parsed)
        except ValidationError as exc:
            logger.warning("Validation failed for %s %s: %s", method, path, exc.errors)
            await self._send_error(send, 400, exc.errors)
            return

        # Re-inject validated body so downstream route handlers can use it
        new_body = json.dumps(validated).encode("utf-8")

        async def new_receive():
            return {"type": "http.request", "body": new_body, "more_body": False}

        # Attach validated body to scope for route handlers
        scope.setdefault("state", {})
        scope["state"]["validated_body"] = validated

        await self.app(scope, new_receive, send)

    @staticmethod
    async def _send_error(send, status: int, errors: Dict[str, str]):
        payload = json.dumps({"detail": "Validation error", "errors": errors}).encode()
        await send({"type": "http.response.start", "status": status, "headers": [
            [b"content-type", b"application/json"],
            [b"content-length", str(len(payload)).encode()],
        ]})
        await send({"type": "http.response.body", "body": payload})


# -- Schema registry ----------------------------------------------------------

_REGISTRY: Dict[str, Dict[str, Dict[str, Any]]] = {}
_REGISTRY_LOCK = threading.RLock()


def register_schema(endpoint_path: str, schema: Dict[str, Dict[str, Any]]) -> None:
    """Register a validation schema for an endpoint path.

    *endpoint_path* should be the route path, e.g. ``"/chat"``.
    *schema* is a dict mapping field names to validation rules.
    """
    with _REGISTRY_LOCK:
        _REGISTRY[endpoint_path] = schema
    logger.info("Registered validation schema for %s", endpoint_path)


# -- Pre-built schemas --------------------------------------------------------

CHAT_SCHEMA = {
    "message": {"type": "str", "required": True, "min_length": 1, "max_length": 4000},
    "session_id": {"type": "str", "required": False, "max_length": 64},
    "model": {"type": "str", "required": False, "max_length": 32},
}

DOCUMENT_UPLOAD_SCHEMA = {
    "filename": {"type": "str", "required": True, "min_length": 1, "max_length": 255},
    "content_type": {"type": "str", "required": True, "enum": ["pdf", "docx", "txt", "md", "csv", "json"]},
}

VOICE_SYNTHESIZE_SCHEMA = {
    "text": {"type": "str", "required": True, "min_length": 1, "max_length": 5000},
    "accent": {"type": "str", "required": False, "max_length": 20},
    "lang": {"type": "str", "required": False, "max_length": 10},
}

YOUTUBE_CAMPAIGN_SCHEMA = {
    "niche": {"type": "str", "required": True, "min_length": 1, "max_length": 100},
    "target_audience": {"type": "str", "required": True, "min_length": 1, "max_length": 200},
    "video_count": {"type": "int", "required": True, "min": 1, "max": 100},
}

# Seed pre-built schemas at import time
register_schema("/chat", CHAT_SCHEMA)
register_schema("/document/upload", DOCUMENT_UPLOAD_SCHEMA)
register_schema("/voice/synthesize", VOICE_SYNTHESIZE_SCHEMA)
register_schema("/youtube/campaign", YOUTUBE_CAMPAIGN_SCHEMA)
