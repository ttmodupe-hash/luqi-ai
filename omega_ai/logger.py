"""Omega AI v3 — Structured Logger
Unified logging with structured output and color support.
"""
from __future__ import annotations

import sys
import time
from enum import Enum
from typing import Any


class LogLevel(Enum):
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3
    FATAL = 4


LEVEL_NAMES = {
    LogLevel.DEBUG: "DEBUG",
    LogLevel.INFO: "INFO",
    LogLevel.WARN: "WARN",
    LogLevel.ERROR: "ERROR",
    LogLevel.FATAL: "FATAL",
}

LEVEL_COLORS = {
    LogLevel.DEBUG: "\033[90m",
    LogLevel.INFO: "\033[36m",
    LogLevel.WARN: "\033[33m",
    LogLevel.ERROR: "\033[31m",
    LogLevel.FATAL: "\033[35m",
}

RESET = "\033[0m"


class Logger:
    """Structured logger with color output."""

    def __init__(self, name: str = "omega", level: LogLevel = LogLevel.INFO, use_color: bool = True) -> None:
        self.name = name
        self.level = level
        self.use_color = use_color and sys.stdout.isatty()
        self.outputs: list[Any] = [sys.stdout]

    def _log(self, level: LogLevel, message: str, **kwargs: Any) -> None:
        if level.value < self.level.value:
            return
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        level_name = LEVEL_NAMES.get(level, "UNKNOWN")
        color = LEVEL_COLORS.get(level, "") if self.use_color else ""
        reset = RESET if self.use_color else ""
        # Structured fields
        fields = " ".join(f'{k}="{v}"' for k, v in kwargs.items())
        line = f"{color}[{timestamp}] [{level_name}] [{self.name}] {message}{reset}"
        if fields:
            line += f" | {fields}"
        for out in self.outputs:
            print(line, file=out)

    def debug(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.INFO, message, **kwargs)

    def warn(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.WARN, message, **kwargs)

    def error(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.ERROR, message, **kwargs)

    def fatal(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.FATAL, message, **kwargs)

    def set_level(self, level: LogLevel) -> None:
        self.level = level

    def add_output(self, output: Any) -> None:
        self.outputs.append(output)


# Global logger instance
log = Logger()
