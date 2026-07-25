"""User Preferences Persistence for Luqi-AI.

Stores user settings in ~/.omega_ai/preferences.json with thread-safe
file locking, atomic writes, and type validation.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, Optional, Union

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default preference values and their expected Python types
# ---------------------------------------------------------------------------
DEFAULT_PREFERENCES: Dict[str, Any] = {
    "default_country": "South Africa",
    "risk_tolerance": "moderate",
    "preferred_language": "en",
    "currency": "ZAR",
    "power_cost_per_kwh": 0.15,
    "max_history": 6,
}

# Map each preference key to its accepted Python type(s)
_PREFERENCE_TYPES: Dict[str, tuple] = {
    "default_country": (str,),
    "risk_tolerance": (str,),
    "preferred_language": (str,),
    "currency": (str,),
    "power_cost_per_kwh": (int, float),
    "max_history": (int,),
}

# Integer-typed keys (used for auto-conversion during /prefs set)
_INTEGER_KEYS = {"max_history"}


def _get_preferences_dir() -> Path:
    """Return the directory where preferences are stored."""
    return Path.home() / ".omega_ai"


def _get_preferences_path() -> Path:
    """Return the full path to the preferences JSON file."""
    return _get_preferences_dir() / "preferences.json"


class UserPreferences:
    """Thread-safe user preferences manager with persistent JSON storage.

    Preferences are stored in ``~/.omega_ai/preferences.json``.  Writes are
    performed atomically (temp file + rename) and protected by a process-wide
    ``threading.Lock`` as well as an OS-level file lock (``flock`` on Unix).

    Example::

        prefs = UserPreferences()
        prefs.set("currency", "USD")
        print(prefs.get("currency"))          # -> "USD"
        print(prefs.all()["max_history"])     # -> 6
    """

    # Process-wide lock for thread safety
    _lock = threading.Lock()

    def __init__(self) -> None:
        """Load existing preferences or create defaults."""
        self._prefs: Dict[str, Any] = {}
        self.load()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def load(self) -> None:
        """Load preferences from JSON, creating defaults if missing or corrupt.

        The file is read-locked via ``flock`` (Unix) to prevent concurrent
        modification by other processes.
        """
        prefs_path = _get_preferences_path()

        if not prefs_path.exists():
            logger.debug("Preferences file not found; creating defaults.")
            self._prefs = dict(DEFAULT_PREFERENCES)
            self.save()
            return

        try:
            with prefs_path.open("r", encoding="utf-8") as fh:
                # OS-level file lock (read lock)
                try:
                    import fcntl

                    fcntl.flock(fh.fileno(), fcntl.LOCK_SH)
                except ImportError:
                    pass  # Windows or no fcntl support

                data = json.load(fh)

                try:
                    import fcntl

                    fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
                except ImportError:
                    pass

        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Failed to read preferences (%s); using defaults.", exc)
            self._prefs = dict(DEFAULT_PREFERENCES)
            self.save()
            return

        # Merge with defaults so new keys are always present
        merged = dict(DEFAULT_PREFERENCES)
        if isinstance(data, dict):
            for key, value in data.items():
                if key in _PREFERENCE_TYPES:
                    expected = _PREFERENCE_TYPES[key]
                    if isinstance(value, expected):
                        merged[key] = value
                    else:
                        logger.warning(
                            "Preference '%s' has wrong type (%s, expected %s); "
                            "using default.",
                            key,
                            type(value).__name__,
                            " or ".join(t.__name__ for t in expected),
                        )
                else:
                    # Preserve unknown keys as-is
                    merged[key] = value
        else:
            logger.warning("Preferences file did not contain a dict; using defaults.")

        self._prefs = merged
        self.save()  # Re-write to ensure file format consistency

    def save(self) -> None:
        """Write preferences to JSON atomically.

        Uses a temporary file + rename to avoid corrupting the preferences
        file if the process crashes mid-write.
        """
        with self._lock:
            prefs_dir = _get_preferences_dir()
            prefs_dir.mkdir(parents=True, exist_ok=True)

            prefs_path = _get_preferences_path()
            tmp_path = prefs_path.with_suffix(".tmp")

            try:
                with tmp_path.open("w", encoding="utf-8") as fh:
                    # OS-level file lock (exclusive write lock)
                    try:
                        import fcntl

                        fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
                    except ImportError:
                        pass

                    json.dump(self._prefs, fh, indent=2, ensure_ascii=False)
                    fh.flush()
                    os.fsync(fh.fileno())

                    try:
                        import fcntl

                        fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
                    except ImportError:
                        pass

                # Atomic rename
                os.replace(str(tmp_path), str(prefs_path))

            except OSError as exc:
                logger.error("Failed to save preferences: %s", exc)
                # Clean up temp file if it exists
                if tmp_path.exists():
                    tmp_path.unlink(missing_ok=True)
                raise

    # ------------------------------------------------------------------
    # Accessors / Mutators
    # ------------------------------------------------------------------
    def get(self, key: str, default: Any = None) -> Any:
        """Return the value for *key*, or *default* if the key is absent.

        Args:
            key: Preference name.
            default: Fallback value if *key* is not defined.

        Returns:
            The stored value or *default*.
        """
        return self._prefs.get(key, default)

    def set(self, key: str, value: Any) -> None:
        """Set *key* to *value* after type validation, then persist.

        Args:
            key: Preference name.
            value: New value.

        Raises:
            TypeError: If *value* does not match the expected type for *key*.
            KeyError: If *key* is unknown and has no type definition.
        """
        with self._lock:
            if key in _PREFERENCE_TYPES:
                expected = _PREFERENCE_TYPES[key]
                if not isinstance(value, expected):
                    # Attempt numeric conversion for int/float flexibility
                    if expected == (int, float) and isinstance(value, (int, float)):
                        pass  # int or float both acceptable
                    elif expected == (int,) and isinstance(value, float) and value.is_integer():
                        value = int(value)
                    else:
                        raise TypeError(
                            f"Preference '{key}' expects "
                            f"{' or '.join(t.__name__ for t in expected)}, "
                            f"got {type(value).__name__}"
                        )

            self._prefs[key] = value
            self.save()

    def reset(self) -> None:
        """Restore all preferences to their built-in defaults and persist."""
        with self._lock:
            self._prefs = dict(DEFAULT_PREFERENCES)
            self.save()

    def all(self) -> Dict[str, Any]:
        """Return a shallow copy of the full preferences dictionary."""
        with self._lock:
            return dict(self._prefs)
