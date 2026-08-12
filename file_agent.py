"""File Agent — Intelligent file handling and processing."""

import json
import os
from typing import Dict, List


class FileAgent:
    """Intelligent file processing agent."""

    def __init__(self, base_path: str = "./data"):
        self.base_path = base_path
        os.makedirs(base_path, exist_ok=True)

    def read(self, filename: str) -> str:
        path = os.path.join(self.base_path, filename)
        with open(path, "r") as f:
            return f.read()

    def write(self, filename: str, content: str):
        path = os.path.join(self.base_path, filename)
        with open(path, "w") as f:
            f.write(content)

    def list_files(self, pattern: str = "*") -> List[str]:
        import glob
        return glob.glob(os.path.join(self.base_path, pattern))

    def analyze(self, filename: str) -> Dict:
        path = os.path.join(self.base_path, filename)
        stat = os.stat(path)
        return {
            "name": filename,
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "extension": os.path.splitext(filename)[1],
        }

    def search_content(self, query: str) -> List[Dict]:
        results = []
        for f in self.list_files():
            try:
                content = self.read(os.path.basename(f))
                if query.lower() in content.lower():
                    results.append({"file": os.path.basename(f), "matches": content.count(query)})
            except:
                pass
        return results


if __name__ == "__main__":
    agent = FileAgent()
    agent.write("test.txt", "Hello World")
    print(agent.analyze("test.txt"))
    print(agent.search_content("Hello"))
