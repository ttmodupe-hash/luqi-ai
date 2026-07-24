#!/usr/bin/env python3
"""Omega AI v3.2.0 — Main Entry Point
Unified interface for all Omega AI capabilities.
Usage: python omega_ai.py [command] [options]
"""

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional

# Ensure project root is in path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from core_brain import OmegaBrain, get_brain, process_query, get_stats, get_capabilities

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

def handle_chat(args):
    """Interactive chat mode."""
    brain = get_brain()
    user_id = args.user_id or f"cli_{int(time.time())}"

    print("=" * 60)
    print("  Omega AI v3.2.0 — Interactive Chat")
    print("  Type 'exit' to quit, 'stats' for system info")
    print("=" * 60)

    while True:
        try:
            query = input("\nYou: ").strip()
            if query.lower() in ("exit", "quit", "q"):
                break
            if query.lower() == "stats":
                print(json.dumps(get_stats(), indent=2))
                continue
            if not query:
                continue

            result = brain.process(user_id, query)
            response = result.get("response", "No response")
            print(f"Omega: {response}")

            if args.verbose:
                print(f"  [module: {result.get('module', 'unknown')}, "
                      f"time: {result.get('response_time_ms', 0)}ms]")

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

    print("\nGoodbye!")


def handle_query(args):
    """Single query mode."""
    brain = get_brain()
    result = brain.process(args.user_id or "cli", args.query)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(result.get("response", "No response"))


def handle_server(args):
    """Start API server."""
    from api_server import run_server
    run_server()


def handle_stats(args):
    """Show system statistics."""
    stats = get_stats()
    print(json.dumps(stats, indent=2))


def handle_capabilities(args):
    """List available capabilities."""
    caps = get_capabilities()
    print("Available Capabilities:")
    for cap in caps:
        print(f"  - {cap}")


def handle_test(args):
    """Run self-test."""
    print("Running Omega AI self-test...")
    brain = get_brain()

    test_queries = [
        ("financial", "How do I budget my money?"),
        ("education", "Help me study for my exam"),
        ("vocational", "I need career advice"),
        ("language", "How do I say hello in Zulu?"),
        ("calculator", "What is 15% of 250?"),
        ("reminder", "Remind me to call mom tomorrow"),
        ("scheduler", "Help me plan my week"),
        ("research", "Research the South African economy"),
        ("knowledge", "What is inflation?"),
    ]

    passed = 0
    failed = 0

    for category, query in test_queries:
        try:
            result = brain.process("test_user", query)
            status = "PASS" if result["status"] == "success" else "FAIL"
            if status == "PASS":
                passed += 1
            else:
                failed += 1
            print(f"  [{status}] {category}: {query[:50]}...")
        except Exception as e:
            failed += 1
            print(f"  [ERROR] {category}: {e}")

    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Omega AI v3.2.0 — African Intelligence Platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python omega_ai.py --chat                    # Interactive chat
  python omega_ai.py --query "What is a stokvel?"  # Single query
  python omega_ai.py --server                  # Start API server
  python omega_ai.py --stats                   # Show statistics
  python omega_ai.py --test                    # Run self-test
  python omega_ai.py --capabilities            # List capabilities
        """
    )

    parser.add_argument("--version", action="version", version="Omega AI 3.2.0")
    parser.add_argument("--user-id", default="cli_user", help="User ID for sessions")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    # Commands
    commands = parser.add_mutually_exclusive_group()
    commands.add_argument("--chat", action="store_true", help="Interactive chat mode")
    commands.add_argument("--query", "-q", help="Single query mode")
    commands.add_argument("--server", "-s", action="store_true", help="Start API server")
    commands.add_argument("--stats", action="store_true", help="Show statistics")
    commands.add_argument("--capabilities", "-c", action="store_true", help="List capabilities")
    commands.add_argument("--test", "-t", action="store_true", help="Run self-test")

    # Output format
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    # Route to handler
    if args.chat:
        handle_chat(args)
    elif args.query:
        handle_query(args)
    elif args.server:
        handle_server(args)
    elif args.stats:
        handle_stats(args)
    elif args.capabilities:
        handle_capabilities(args)
    elif args.test:
        success = handle_test(args)
        sys.exit(0 if success else 1)
    else:
        # Default: interactive chat
        handle_chat(args)


if __name__ == "__main__":
    main()
