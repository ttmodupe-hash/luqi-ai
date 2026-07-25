"""Omega AI v3 — Automated Error Detection & Repair System
Scans for common code issues, suggests fixes, and tracks error history.
Supports anti-pattern detection, fix generation, and repair logging.

Usage:
    from error_repair import ErrorRepairSystem
    ers = ErrorRepairSystem()
    issues = ers.scan_code(python_source_code)
    fixes = ers.generate_fixes(issues)
"""
from __future__ import annotations

import ast
import hashlib
import json
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple


@dataclass
class CodeIssue:
    """A detected code issue."""
    rule_id: str
    severity: str  # error, warning, info
    message: str
    file_path: str = ""
    line: int = 0
    column: int = 0
    snippet: str = ""
    suggested_fix: str = ""
    category: str = ""


@dataclass
class RepairLog:
    """Log entry for a repair action."""
    timestamp: str
    file_path: str
    issue_count: int
    fixes_applied: int
    hash_before: str = ""
    hash_after: str = ""
    details: List[Dict] = field(default_factory=list)


class ErrorRepairSystem:
    """Automated error detection and repair for Python code."""

    RULES: Dict[str, Dict[str, Any]] = {
        "PY001": {"severity": "error", "pattern": r"except\s*:\s*(?:\n|$)", "message": "Bare except clause - catches SystemExit and KeyboardInterrupt", "fix": "Use 'except Exception:' or more specific exception types", "category": "exception_handling"},
        "PY002": {"severity": "error", "pattern": r"os\.system\s*\(", "message": "Use of os.system() - security risk", "fix": "Use subprocess.run() with proper argument lists", "category": "security"},
        "PY003": {"severity": "warning", "pattern": r"datetime\.utcnow\s*\(\)", "message": "utcnow() is deprecated in Python 3.12+", "fix": "Use datetime.now(timezone.utc)", "category": "deprecation"},
        "PY004": {"severity": "warning", "pattern": r"print\s+\([^)]*\)", "message": "Print statement in production code", "fix": "Use logging module instead", "category": "best_practice"},
        "PY005": {"severity": "warning", "pattern": r"#\s*TODO|#\s*FIXME|#\s*HACK", "message": "Unresolved TODO/FIXME/HACK comment", "fix": "Address the technical debt item", "category": "technical_debt", "flags": re.IGNORECASE},
        "PY006": {"severity": "info", "pattern": r"def\s+\w+\s*\([^)]*\)\s*:\s*(?:\n[^\n]*)*?\n\s+pass\s*(?:\n|$)", "message": "Empty function with only pass", "fix": "Implement the function or add a docstring with 'NotImplemented'", "category": "completeness"},
        "PY007": {"severity": "warning", "pattern": r"\.format\s*\(", "message": "Use of .format() - consider f-strings for readability", "fix": "Use f-string: f'...{var}...'", "category": "style"},
        "PY008": {"severity": "error", "pattern": r"eval\s*\(", "message": "Use of eval() - critical security risk", "fix": "Use ast.literal_eval() for safe evaluation or json.loads()", "category": "security"},
        "PY009": {"severity": "error", "pattern": r"exec\s*\(", "message": "Use of exec() - critical security risk", "fix": "Refactor to avoid dynamic code execution", "category": "security"},
        "PY010": {"severity": "warning", "pattern": r"input\s*\(\)", "message": "Use of input() in non-interactive code", "fix": "Use command-line arguments (argparse) or configuration files", "category": "best_practice"},
        "PY011": {"severity": "warning", "pattern": r"global\s+\w+", "message": "Use of global variable", "fix": "Pass as parameter or use a class attribute", "category": "best_practice"},
        "PY012": {"severity": "info", "pattern": r"if\s+\w+\s+==\s+(True|False)\s*:", "message": "Comparing boolean with == True/False", "fix": "Use 'if var:' or 'if not var:'", "category": "style"},
        "PY013": {"severity": "warning", "pattern": r"open\s*\([^)]+\)(?!\s*with)", "message": "File opened without 'with' statement", "fix": "Use 'with open(...) as f:' for proper resource management", "category": "resource_leak"},
        "PY014": {"severity": "warning", "pattern": r"requests\.get\s*\([^)]+\)(?!\s*\.raise_for_status)", "message": "HTTP request without error checking", "fix": "Add .raise_for_status() or check status_code", "category": "error_handling"},
        "PY015": {"severity": "info", "pattern": r"#\s*XXX", "message": "XXX marker in code", "fix": "Resolve or remove the XXX marker", "category": "technical_debt"},
    }

    def __init__(self, log_dir: Optional[Path] = None):
        self.log_dir = log_dir or Path(".omega_sessions/repairs")
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.repair_history: List[RepairLog] = []

    def scan_code(self, source: str, file_path: str = "<string>") -> List[CodeIssue]:
        """Scan Python source code for issues."""
        issues = []
        lines = source.split("\n")
        # Pattern-based scanning
        for rule_id, rule in self.RULES.items():
            flags = rule.get("flags", 0)
            for i, line in enumerate(lines, 1):
                if re.search(rule["pattern"], line, flags):
                    issues.append(CodeIssue(
                        rule_id=rule_id, severity=rule["severity"],
                        message=rule["message"], file_path=file_path,
                        line=i, column=line.find(line.strip()) + 1,
                        snippet=line.strip()[:80], suggested_fix=rule["fix"],
                        category=rule["category"],
                    ))
        # AST-based scanning
        try:
            tree = ast.parse(source)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if not ast.get_docstring(node) and len(node.body) > 1:
                        issues.append(CodeIssue(
                            rule_id="PY016", severity="info", message=f"Function '{node.name}' missing docstring",
                            file_path=file_path, line=node.lineno, column=node.col_offset,
                            snippet=f"def {node.name}(...)", suggested_fix=f"Add a docstring to {node.name}", category="documentation"))
                elif isinstance(node, ast.ExceptHandler):
                    if node.type is None:
                        issues.append(CodeIssue(
                            rule_id="PY001-AST", severity="error", message="Bare except clause detected via AST",
                            file_path=file_path, line=node.lineno, column=0,
                            snippet="except:", suggested_fix="Use 'except Exception:'", category="exception_handling"))
        except SyntaxError as e:
            issues.append(CodeIssue(
                rule_id="PY999", severity="error", message=f"Syntax error: {e.msg}",
                file_path=file_path, line=e.lineno or 0, column=e.offset or 0,
                snippet=e.text.strip() if e.text else "", suggested_fix="Fix the syntax error", category="syntax"))
        return issues

    def scan_file(self, file_path: str) -> List[CodeIssue]:
        """Scan a single file for issues."""
        path = Path(file_path)
        if not path.exists():
            return [CodeIssue(rule_id="FILE", severity="error", message=f"File not found: {file_path}", file_path=file_path)]
        source = path.read_text(encoding="utf-8")
        return self.scan_code(source, str(path))

    def scan_directory(self, directory: str, pattern: str = "*.py") -> Dict[str, List[CodeIssue]]:
        """Recursively scan a directory for issues."""
        results = {}
        root = Path(directory)
        for file_path in root.rglob(pattern):
            if "__pycache__" in str(file_path):
                continue
            issues = self.scan_file(str(file_path))
            if issues:
                results[str(file_path)] = issues
        return results

    def generate_fixes(self, issues: List[CodeIssue]) -> List[Dict[str, str]]:
        """Generate fix suggestions for detected issues."""
        fixes = []
        for issue in issues:
            fixes.append({
                "rule": issue.rule_id, "severity": issue.severity,
                "location": f"{issue.file_path}:{issue.line}",
                "problem": issue.message, "suggestion": issue.suggested_fix,
                "category": issue.category,
                "auto_fixable": issue.rule_id in ("PY003", "PY012"),
            })
        return fixes

    def apply_auto_fixes(self, source: str, issues: List[CodeIssue]) -> str:
        """Apply automatic fixes for supported rules."""
        lines = source.split("\n")
        for issue in sorted(issues, key=lambda i: i.line, reverse=True):
            if issue.rule_id == "PY003":
                lines[issue.line - 1] = lines[issue.line - 1].replace("datetime.utcnow()", "datetime.now(timezone.utc)")
            elif issue.rule_id == "PY012":
                line = lines[issue.line - 1]
                line = re.sub(r"if\s+(\w+)\s+==\s+True\s*:", r"if \\1:", line)
                line = re.sub(r"if\s+(\w+)\s+==\s+False\s*:", r"if not \\1:", line)
                lines[issue.line - 1] = line
        return "\n".join(lines)

    def create_repair_log(self, file_path: str, issues: List[CodeIssue], fixed_source: str = "") -> RepairLog:
        """Create a repair log entry."""
        source = Path(file_path).read_text(encoding="utf-8") if Path(file_path).exists() else ""
        hash_before = hashlib.sha256(source.encode()).hexdigest()[:16] if source else ""
        hash_after = hashlib.sha256(fixed_source.encode()).hexdigest()[:16] if fixed_source else hash_before
        fixes = self.generate_fixes(issues)
        auto_fixable = sum(1 for f in fixes if f["auto_fixable"])
        log = RepairLog(
            timestamp=datetime.now(timezone.utc).isoformat(), file_path=file_path,
            issue_count=len(issues), fixes_applied=auto_fixable,
            hash_before=hash_before, hash_after=hash_after, details=fixes,
        )
        self.repair_history.append(log)
        # Persist to disk
        log_file = self.log_dir / f"repair_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        log_file.write_text(json.dumps(asdict(log), indent=2), encoding="utf-8")
        return log

    def get_repair_history(self) -> List[RepairLog]:
        """Get all repair history."""
        return self.repair_history

    def get_stats(self) -> Dict[str, Any]:
        """Get scanning statistics."""
        all_issues = []
        for log in self.repair_history:
            all_issues.extend(log.details)
        by_severity = {}
        by_category = {}
        for issue in all_issues:
            sev = issue.get("severity", "unknown")
            cat = issue.get("category", "unknown")
            by_severity[sev] = by_severity.get(sev, 0) + 1
            by_category[cat] = by_category.get(cat, 0) + 1
        return {
            "total_scans": len(self.repair_history),
            "total_issues": len(all_issues),
            "fixes_applied": sum(log.fixes_applied for log in self.repair_history),
            "by_severity": by_severity,
            "by_category": by_category,
        }

    def format_report(self, issues: List[CodeIssue]) -> str:
        """Format issues as a readable report."""
        if not issues:
            return "✓ No issues found. Code looks clean!"
        lines = [f"## Code Analysis Report ({len(issues)} issue{'s' if len(issues) > 1 else ''})", ""]
        by_severity = {"error": [], "warning": [], "info": []}
        for issue in issues:
            by_severity.get(issue.severity, []).append(issue)
        for sev in ["error", "warning", "info"]:
            items = by_severity[sev]
            if not items:
                continue
            icon = "🔴" if sev == "error" else "🟡" if sev == "warning" else "🔵"
            lines.append(f"### {icon} {sev.upper()} ({len(items)})")
            for issue in items:
                lines.append(f"  [{issue.rule_id}] Line {issue.line}: {issue.message}")
                lines.append(f"    Snippet: {issue.snippet}")
                lines.append(f"    Fix: {issue.suggested_fix}")
            lines.append("")
        return "\n".join(lines)


if __name__ == "__main__":
    ers = ErrorRepairSystem()
    sample_code = '''
import os
from datetime import datetime

def bad_function():
    pass

def process():
    os.system("ls -la")
    try:
        x = 1 / 0
    except:
        print("error")
    t = datetime.utcnow()
    if t == True:
        print("yes")
    eval("1+1")
    # TODO: fix this later
'''
    issues = ers.scan_code(sample_code, "test.py")
    print(ers.format_report(issues))
    print(f"\nStats: {ers.get_stats()}")
