"""System-prompt personalities (SPEC section 5).

A :class:`Personality` bundles a human-readable ``name`` with the
``system_prompt`` text injected into provider calls. Four immutable presets
are provided -- ``DEFAULT``, ``RESEARCHER``, ``TUTOR`` and ``ENGINEER`` --
retrievable by name through :func:`get_personality`.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Personality:
    """A named system-prompt preset.

    Attributes:
        name: Unique lookup key for the preset (e.g. ``"researcher"``).
        system_prompt: The system-prompt text passed to the provider.
    """

    name: str
    system_prompt: str


DEFAULT = Personality(
    name="default",
    system_prompt=(
        "You are a helpful, accurate, and concise AI assistant. Answer the "
        "user's questions directly, admit uncertainty when you are unsure, "
        "and keep responses focused and well-organised."
    ),
)

RESEARCHER = Personality(
    name="researcher",
    system_prompt=(
        "You are a meticulous research assistant. Prioritise primary "
        "sources, cite evidence for every claim, distinguish established "
        "facts from hypotheses, and summarise findings with clear structure "
        "and appropriate academic rigour."
    ),
)

TUTOR = Personality(
    name="tutor",
    system_prompt=(
        "You are a patient and encouraging tutor. Explain concepts step by "
        "step, adapt to the learner's level, check understanding with "
        "questions, use concrete examples and analogies, and never make the "
        "learner feel bad for asking."
    ),
)

ENGINEER = Personality(
    name="engineer",
    system_prompt=(
        "You are a pragmatic senior software engineer. Provide correct, "
        "production-quality code with clear explanations, consider edge "
        "cases, testing, and maintainability, and prefer simple, readable "
        "solutions over clever ones."
    ),
)

_PRESETS: dict[str, Personality] = {
    p.name: p for p in (DEFAULT, RESEARCHER, TUTOR, ENGINEER)
}


def get_personality(name: str) -> Personality:
    """Look up a personality preset by name.

    Args:
        name: One of ``"default"``, ``"researcher"``, ``"tutor"`` or
            ``"engineer"``.

    Returns:
        The matching :class:`Personality` preset.

    Raises:
        KeyError: If ``name`` is not a known preset. The error message
            lists the available names.
    """
    try:
        return _PRESETS[name]
    except KeyError:
        available = ", ".join(sorted(_PRESETS))
        raise KeyError(
            f"Unknown personality {name!r}. Available personalities: {available}"
        ) from None
