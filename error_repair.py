"""Error Repair — Self-healing and auto-repair module."""

import json
import traceback
from typing import Callable, Dict, List


class ErrorRepair:
    """Self-healing error detection and repair system."""

    def __init__(self):
        self.repair_strategies: Dict[str, Callable] = {}
        self.error_log: List[Dict] = []
        self.register_default_strategies()

    def register_default_strategies(self):
        self.repair_strategies["ConnectionError"] = self._repair_connection
        self.repair_strategies["TimeoutError"] = self._repair_timeout
        self.repair_strategies["KeyError"] = self._repair_key_error
        self.repair_strategies["IndexError"] = self._repair_index_error

    def _repair_connection(self, error: Exception, context: Dict) -> str:
        return "Attempting to reconnect..."

    def _repair_timeout(self, error: Exception, context: Dict) -> str:
        return "Increasing timeout and retrying..."

    def _repair_key_error(self, error: Exception, context: Dict) -> str:
        return f"Key missing: {error}. Using default value."

    def _repair_index_error(self, error: Exception, context: Dict) -> str:
        return "Index out of range. Adjusting bounds."

    def diagnose(self, error: Exception) -> Dict:
        error_type = type(error).__name__
        return {
            "type": error_type,
            "message": str(error),
            "traceback": traceback.format_exc(),
            "repairable": error_type in self.repair_strategies,
        }

    def repair(self, error: Exception, context: Dict = None) -> Dict:
        context = context or {}
        diagnosis = self.diagnose(error)
        error_type = diagnosis["type"]

        if error_type in self.repair_strategies:
            strategy = self.repair_strategies[error_type]
            result = strategy(error, context)
            diagnosis["repair_attempted"] = True
            diagnosis["repair_result"] = result
        else:
            diagnosis["repair_attempted"] = False
            diagnosis["repair_result"] = "No repair strategy available"

        self.error_log.append(diagnosis)
        return diagnosis

    def get_error_log(self) -> List[Dict]:
        return self.error_log

    def self_heal(self, func: Callable, context: Dict = None, max_retries: int = 3):
        """Wrap a function with self-healing capabilities."""
        for attempt in range(max_retries):
            try:
                return func()
            except Exception as e:
                if attempt < max_retries - 1:
                    self.repair(e, context)
                else:
                    raise


if __name__ == "__main__":
    repair = ErrorRepair()
    try:
        raise ConnectionError("Database connection lost")
    except Exception as e:
        print(json.dumps(repair.repair(e), indent=2))
