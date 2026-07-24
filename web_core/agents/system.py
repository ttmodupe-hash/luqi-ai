"""
web_core.agents.system - System health, metrics, self-improvement.
Handles anything that introspects the running system.
"""

from __future__ import annotations

import ast
import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from web_core.db.connection import ConnectionPool
from web_core.models import SystemHealth

logger = logging.getLogger("luqi.agents.system")


class SystemAgent:
    """System introspection: health, metrics, self-improvement, git status."""

    def __init__(self, pool: ConnectionPool, project_root: Path, version: str = "25.2.0"):
        self.pool = pool
        self.project_root = project_root
        self.version = version

    def health(self) -> SystemHealth:
        conv_row = self.pool.fetchone("SELECT COUNT(*) as c FROM conversations")
        doc_row = self.pool.fetchone("SELECT COUNT(*) as c FROM uploads")
        req_row = self.pool.fetchone("SELECT COUNT(*) as c FROM request_logs")
        cap_row = self.pool.fetchone("SELECT COUNT(*) as c FROM capabilities WHERE status = 'active'")
        from datetime import datetime
        return SystemHealth(
            status="healthy",
            version=self.version,
            capabilities_active=cap_row["c"] if cap_row else 0,
            conversations=conv_row["c"] if conv_row else 0,
            documents=doc_row["c"] if doc_row else 0,
            requests_total=req_row["c"] if req_row else 0,
            timestamp=datetime.utcnow().isoformat(),
        )

    def metrics_prometheus(self) -> str:
        h = self.health()
        return (
            f"# LUQI Prometheus Metrics\n"
            f"luqi_conversations_total {h.conversations}\n"
            f"luqi_documents_total {h.documents}\n"
            f"luqi_requests_total {h.requests_total}\n"
            f"luqi_capabilities_active {h.capabilities_active}\n"
            f'luqi_version{{version="{self.version}"}} 1\n'
        )

    def analyze_file(self, filepath: Path) -> Dict[str, Any]:
        """AST-based analysis of a single Python file."""
        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception as e:
            return {"error": str(e)}
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return {"error": "Syntax error", "lines": len(content.splitlines())}

        functions = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
        classes = [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
        imports = [n for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))]

        issues = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                complexity = len(list(ast.walk(node)))
                if complexity > 200:
                    issues.append(f"Function '{node.name}' too complex ({complexity})")
                if ast.get_docstring(node) is None and not node.name.startswith("_"):
                    issues.append(f"Function '{node.name}' missing docstring")
            if isinstance(node, ast.Try):
                for h in node.handlers:
                    if h.type is None:
                        issues.append("Bare except: found")
                        break

        try:
            rel_path = str(filepath.relative_to(self.project_root))
        except ValueError:
            rel_path = str(filepath)
        return {
            "file": rel_path,
            "lines": len(content.splitlines()),
            "functions": len(functions),
            "classes": len(classes),
            "imports": len(imports),
            "docstring_coverage": sum(1 for f in functions if ast.get_docstring(f)) / max(len(functions), 1),
            "issues": issues,
        }

    def analyze_project(self) -> List[Dict[str, Any]]:
        results = []
        for py_file in self.project_root.rglob("*.py"):
            if "__pycache__" in str(py_file) or ".git" in str(py_file):
                continue
            try:
                results.append(self.analyze_file(py_file))
            except Exception:
                pass
        return results

    def generate_improvement_report(self) -> str:
        results = self.analyze_project()
        total_lines = sum(r.get("lines", 0) for r in results)
        total_functions = sum(r.get("functions", 0) for r in results)
        total_issues = sum(len(r.get("issues", [])) for r in results)
        issue_samples = [i for r in results for i in r.get("issues", [])][:10]
        return (
            f"# Self-Improvement Report\n\n"
            f"Files analyzed: {len(results)}\n"
            f"Total lines: {total_lines}\n"
            f"Total functions: {total_functions}\n"
            f"Issues found: {total_issues}\n\n"
            f"## Top Issues\n" +
            "".join(f"- {i}\n" for i in issue_samples)
        )

    def git_status(self) -> Dict[str, Any]:
        try:
            result = subprocess.run(
                ["git", "-C", str(self.project_root), "status", "--short"],
                capture_output=True, text=True, timeout=10,
            )
            files = [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
            return {"dirty": len(files) > 0, "changed_files": files}
        except Exception as e:
            return {"dirty": False, "error": str(e)}

    def last_commit(self) -> str:
        try:
            result = subprocess.run(
                ["git", "-C", str(self.project_root), "log", "-1", "--oneline"],
                capture_output=True, text=True, timeout=10,
            )
            return result.stdout.strip()
        except Exception:
            return "Unknown"
