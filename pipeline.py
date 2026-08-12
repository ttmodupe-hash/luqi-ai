"""Pipeline — Data processing pipeline engine."""

import json
from typing import Any, Callable, Dict, List


class Pipeline:
    """Configurable data processing pipeline."""

    def __init__(self, name: str = "default"):
        self.name = name
        self.steps = []

    def add_step(self, name: str, processor: Callable, config: Dict = None):
        self.steps.append({"name": name, "processor": processor, "config": config or {}})

    def execute(self, data: Any) -> Dict:
        result = data
        step_results = []
        for step in self.steps:
            try:
                result = step["processor"](result, **step["config"])
                step_results.append({"name": step["name"], "status": "success", "output": result})
            except Exception as e:
                step_results.append({"name": step["name"], "status": "error", "error": str(e)})
                return {"status": "failed", "failed_at": step["name"], "steps": step_results}
        return {"status": "success", "result": result, "steps": step_results}

    def get_steps(self) -> List[Dict]:
        return [{"name": s["name"], "config": s["config"]} for s in self.steps]

    def clear(self):
        self.steps = []


if __name__ == "__main__":
    pipeline = Pipeline("text_processing")
    pipeline.add_step("lowercase", lambda x: x.lower())
    pipeline.add_step("strip", lambda x: x.strip())
    result = pipeline.execute("  HELLO WORLD  ")
    print(json.dumps(result, indent=2))
