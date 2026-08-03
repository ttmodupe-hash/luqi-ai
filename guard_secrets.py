#!/usr/bin/env python3
"""
LUQI AI - Secret Guard (guard_secrets.py)

Blocks API keys and .env files from ever being committed to git.
Stdlib only. Exit 0 = clean, 1 = secret found (commit blocked).

Usage:
    py -3.11 guard_secrets.py --staged   # check staged files (pre-commit hook)
    py -3.11 guard_secrets.py --all      # check all tracked files
"""
import os
import re
import subprocess
import sys

# --- key shapes we never allow in the repo ---------------------------------
PATTERNS = [
    ("OpenAI project key", re.compile(r"sk-proj-[0-9A-Za-z_\-]{10,}")),
    ("OpenAI key", re.compile(r"sk-[A-Za-z0-9]{20,}")),
    ("Anthropic key", re.compile(r"sk-ant-[0-9A-Za-z_\-]{10,}")),
    ("Google API key", re.compile(r"AIza[0-9A-Za-z_\-]{35}")),
    ("Google credential", re.compile(r"AQ\.[0-9A-Za-z_\-]{20,}")),
    ("GitHub token", re.compile(r"(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})")),
    ("AWS access key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("Serper-shaped secret (32 hex)", re.compile(r"\b[0-9a-f]{32}\b")),
]

# files we never scan (placeholders live here on purpose)
SKIP_FILES = {"guard_secrets.py", ".env.example"}

# .env files are blocked outright (except the empty template)
ENV_BLOCK = re.compile(r"(^|/)\.env($|\.)")


def mask(s):
    return s[:4] + "..." + s[-2:] if len(s) > 8 else "***"


def run_git(args):
    return subprocess.run(["git"] + args, capture_output=True, text=True).stdout


def staged_files():
    out = run_git(["diff", "--cached", "--name-only", "--diff-filter=ACM"])
    files = []
    for f in out.splitlines():
        f = f.strip()
        if f:
            content = run_git(["show", ":" + f])
            files.append((f, content))
    return files


def all_files():
    out = run_git(["ls-files"])
    files = []
    for f in out.splitlines():
        f = f.strip()
        if not f or not os.path.isfile(f):
            continue
        try:
            with open(f, "r", encoding="utf-8", errors="replace") as fh:
                files.append((f, fh.read()))
        except OSError:
            pass
    return files


def scan(files):
    problems = []
    for path, content in files:
        base = os.path.basename(path)
        norm = path.replace("\\", "/")
        if base in SKIP_FILES:
            continue
        if ENV_BLOCK.search(norm) and base != ".env.example":
            problems.append((path, 0, ".env file must NEVER be committed", ""))
            continue
        for i, line in enumerate(content.splitlines(), 1):
            for name, pat in PATTERNS:
                for m in pat.finditer(line):
                    problems.append((path, i, name, mask(m.group(0))))
    return problems


def main():
    mode = "--staged" if "--staged" in sys.argv else "--all"
    files = staged_files() if mode == "--staged" else all_files()
    if not files:
        print("secret-guard: nothing to scan")
        return 0
    problems = scan(files)
    if not problems:
        print("secret-guard: clean (%d file(s) scanned)" % len(files))
        return 0
    print("SECRET-GUARD: COMMIT BLOCKED - possible secret(s) found:")
    for path, line, name, frag in problems:
        where = "%s:%d" % (path, line) if line else path
        extra = (" found " + frag) if frag else ""
        print("  !! %s -> %s%s" % (where, name, extra))
    print("")
    print("If this is a real key: remove it, put it in .env (gitignored),")
    print("and rotate it if it was ever committed before.")
    print("If you are 100% sure it is a false alarm:")
    print("    git commit --no-verify")
    return 1


if __name__ == "__main__":
    sys.exit(main())
