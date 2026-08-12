"""Logger — Centralized logging system."""

import json
from datetime import datetime
from typing import Dict, List


class Logger:
    """Centralized logging for Omega AI."""

    def __init__(self, level: str = "INFO"):
        self.level = level
        self.levels = {"DEBUG": 0, "INFO": 1, "WARNING": 2, "ERROR": 3, "CRITICAL": 4}
        self.logs = []

    def log(self, message: str, level: str = "INFO", source: str = "system"):
        if self.levels.get(level, 1) >= self.levels.get(self.level, 1):
            entry = {
                "timestamp": datetime.now().isoformat(),
                "level": level,
                "source": source,
                "message": message,
            }
            self.logs.append(entry)
            print(f"[{entry['timestamp']}] {level}: {message}")

    def debug(self, message: str, source: str = "system"):
        self.log(message, "DEBUG", source)

    def info(self, message: str, source: str = "system"):
        self.log(message, "INFO", source)

    def warning(self, message: str, source: str = "system"):
        self.log(message, "WARNING", source)

    def error(self, message: str, source: str = "system"):
        self.log(message, "ERROR", source)

    def critical(self, message: str, source: str = "system"):
        self.log(message, "CRITICAL", source)

    def get_logs(self, level: str = None, source: str = None) -> List[Dict]:
        results = self.logs
        if level:
            results = [l for l in results if l["level"] == level]
        if source:
            results = [l for l in results if l["source"] == source]
        return results

    def export(self, path: str):
        with open(path, "w") as f:
            json.dump(self.logs, f, indent=2)


if __name__ == "__main__":
    logger = Logger()
    logger.info("System started")
    logger.error("Connection failed", source="network")
    print(json.dumps(logger.get_logs(level="ERROR"), indent=2))
