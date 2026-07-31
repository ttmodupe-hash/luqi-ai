"""Structured output extraction and validation (SPEC section 5).

Model text is coerced into a pydantic model: JSON is located even when
wrapped in ```json fences or embedded in surrounding prose, then
validated against the target schema. On failure a single retry prompt
can be produced via :func:`build_retry_prompt`.
"""

from __future__ import annotations

import json
import re
from typing import Any, Callable, TypeVar

from pydantic import BaseModel, ValidationError

from claude_engine.utils.errors import StructuredOutputError

T = TypeVar("T", bound=BaseModel)

_FENCE_RE = re.compile(r"```(?:json|JSON)?\s*(.*?)```", re.DOTALL)


def _candidate_payloads(text: str) -> list[str]:
    """Yield candidate JSON substrings, most specific first.

    Considers fenced code blocks first, then the largest balanced
    ``{...}`` span in the text, then the stripped text itself.
    """
    candidates: list[str] = []
    for match in _FENCE_RE.finditer(text):
        inner = match.group(1).strip()
        if inner:
            candidates.append(inner)

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start : end + 1].strip())

    stripped = text.strip()
    if stripped:
        candidates.append(stripped)

    seen: set[str] = set()
    unique: list[str] = []
    for candidate in candidates:
        if candidate not in seen:
            seen.add(candidate)
            unique.append(candidate)
    return unique


def _parse_and_validate(text: str, schema: type[T]) -> T:
    """Locate JSON in ``text`` and validate it against ``schema``.

    Raises:
        StructuredOutputError: If no candidate parses as JSON, or the
            parsed JSON fails schema validation.
    """
    last_error: Exception | None = None
    parsed_any = False
    for candidate in _candidate_payloads(text):
        try:
            data: Any = json.loads(candidate)
        except json.JSONDecodeError as exc:
            last_error = exc
            continue
        parsed_any = True
        try:
            return schema.model_validate(data)
        except ValidationError as exc:
            last_error = exc
    detail = (
        "no JSON object could be located in the model output"
        if not parsed_any
        else "the extracted JSON failed schema validation"
    )
    raise StructuredOutputError(
        f"Could not extract {schema.__name__}: {detail} ({last_error}).",
        schema=schema.__name__,
    ) from last_error


def build_retry_prompt(text: str, schema: type[BaseModel], error: Exception) -> str:
    """Build the single retry prompt sent back to the model after a failure.

    Args:
        text: The original model output that failed to parse/validate.
        schema: The target pydantic model class.
        error: The exception raised during the failed attempt.

    Returns:
        A prompt asking the model to re-emit the answer as raw JSON that
        conforms to the schema's fields.
    """
    fields = schema.model_json_schema().get("properties", {})
    field_lines = "\n".join(
        f"- {name} ({spec.get('type', 'any')}): {spec.get('description', '')}".rstrip(": ")
        for name, spec in fields.items()
    ) or "- (see JSON schema below)"
    return (
        "Your previous response could not be parsed as valid JSON for the "
        f"schema {schema.__name__}.\n"
        f"Parse/validation error: {error}\n\n"
        f"Previous response:\n{text}\n\n"
        "Required fields:\n"
        f"{field_lines}\n\n"
        "JSON schema:\n"
        f"{json.dumps(schema.model_json_schema(), indent=2)}\n\n"
        "Respond with ONLY a single valid JSON object. No markdown fences, "
        "no prose, no commentary."
    )


def extract(
    text: str,
    schema: type[T],
    retry: Callable[[str], str] | None = None,
) -> T:
    """Parse JSON from model ``text`` and validate it against ``schema``.

    Tolerates ```json fenced blocks and JSON embedded in surrounding
    prose. If the first attempt fails and a ``retry`` callable is given,
    exactly one retry prompt is built via :func:`build_retry_prompt` and
    passed to ``retry``; the returned text is parsed once more.

    Args:
        text: Raw model output possibly containing JSON.
        schema: The pydantic model class to validate against.
        retry: Optional callable that takes a retry prompt and returns a
            fresh model completion. Used for exactly one retry.

    Returns:
        A validated instance of ``schema``.

    Raises:
        StructuredOutputError: If parsing/validation fails on the first
            attempt (and no ``retry`` is provided) or after the single
            retry also fails. The retry prompt is attached as
            ``context["retry_prompt"]``.
    """
    try:
        return _parse_and_validate(text, schema)
    except StructuredOutputError as first_error:
        retry_prompt = build_retry_prompt(text, schema, first_error)
        if retry is None:
            first_error.context.setdefault("retry_prompt", retry_prompt)
            raise
        try:
            retry_text = retry(retry_prompt)
        except Exception as exc:
            raise StructuredOutputError(
                f"Retry for {schema.__name__} failed while re-querying the "
                f"model: {exc}",
                schema=schema.__name__,
                retry_prompt=retry_prompt,
            ) from exc
        try:
            return _parse_and_validate(retry_text, schema)
        except StructuredOutputError as second_error:
            raise StructuredOutputError(
                f"Structured output extraction for {schema.__name__} failed "
                f"after 1 retry: {second_error}",
                schema=schema.__name__,
                retry_prompt=retry_prompt,
            ) from second_error
