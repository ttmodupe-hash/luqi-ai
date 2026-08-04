# LUQI AI v29.12.0 "Prompt Forge" - Unified Master Engine

![version](https://img.shields.io/badge/version-29.12.0-brightgreen) ![python](https://img.shields.io/badge/python-3.11-blue) ![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![self-test](https://img.shields.io/badge/self--test-172%2F172-brightgreen) ![license](https://img.shields.io/badge/license-MIT-lightgrey)

**One 427 KB file. Zero dependencies. Seventeen subsystems. 172 self-test checks.**
A personal AI Unified Master Engine written in pure Python standard library - built in South Africa, MIT licensed, free forever.

## What it is

`omega.py` is the entire product: a modular CLI engine with persistent memory that unifies 17 capability subsystems behind one graceful command line. No pip installs, no accounts, no servers. It runs **fully offline** out of the box; every connector degrades honestly when its API key is absent - hints, never tracebacks.

| # | Subsystem | # | Subsystem |
|---|---|---|---|
| 1 | Build & Sync | 10 | Evolution Engine (sandboxed self-improvement) |
| 2 | Mining & Investment | 11 | Voice (TTS) |
| 3 | Tax Support | 12 | Image Generation |
| 4 | API & Security Gatekeeper | 13 | GitHub REST |
| 5 | Deep Research | 14 | Reminders |
| 6 | Companion/Tutor | 15 | Document Q&A |
| 7 | Opportunity Engine | 16 | Rights & Travel (SA-deep + world layer) |
| 8 | Finance Literacy | 17 | Prompt Forge (expert-prompt compiler) |
| 9 | Self-Improvement | | |

Plus: 100 language packs (70 African), persistent memory with corruption recovery, audit logging, and a `--selftest` that proves every claim on a fresh clone.

## Quickstart

```bash
git clone https://github.com/ttmodupe-hash/luqi-ai.git
cd luqi-ai
python omega.py --selftest     # 172/172 checks pass (Windows: py -3.11)
python omega.py                # interactive [OMEGA] > terminal
python omega.py "prompt build me a budget app"   # one-shot mode
```

A taste of the terminal:

```text
[OMEGA] > prompt build me a budget app     # compiles an EXPERT PROMPT + 6 coaching tips
[OMEGA] > prompt add must include savings goals
[OMEGA] > what are my rights at a roadblock   # offline rights guide, with disclaimer
[OMEGA] > map dir cape town to durban         # opens directions in your browser
[OMEGA] > teach mathematics                   # classroom mode - online or honest offline
[OMEGA] > ingest https://en.wikipedia.org/wiki/South_Africa
[OMEGA] > ask what is south africa known for  # answers from your docs; web when keyed
[OMEGA] > voice speed 1.3 | say hello world   # adjustable speech (keyed)
[OMEGA] > launch                              # GO/NO-GO pre-flight checklist
```

## How the distribution works (read this - it is the security model)

The engine ships **split**: root `omega.py` is a 2 KB loader; the real engine lives as 12 verified byte-parts under `.omega_parts/`. On every run the loader concatenates the parts, verifies the exact byte count (`427,038`) **and** the pinned SHA-256 (`cbcd3689...`), and only then executes. Corrupt or tampered parts = clean refusal with a re-clone message. `.gitattributes` marks the parts as binary so Windows `core.autocrlf` can never corrupt them. Every release is proven this way on a fresh anonymous clone before it ships.

## Configuration (.env - all optional)

```bash
cp .env.example .env   # then fill in only what you want
```

Without any keys the engine is 100% functional offline. Keys unlock: `OPENAI_API_KEY` (LLM answers, voice, images), `SERPER_API_KEY` (web-backed `ask` fallback), `OPENROUTER_API_KEY` (online evolution), `GITHUB_TOKEN` + `GITHUB_REPO` (sync). Secrets are masked everywhere, `.env` is gitignored, and `guard_secrets.py` blocks accidental key commits.

## Repo layout

- `omega.py` - the loader (2 KB) - **this is the only entry point**
- `.omega_parts/` - the engine itself (12 sha-verified byte-parts, 427,038 bytes total)
- `.env.example` - configuration template (all values empty)
- `guard_secrets.py`, `.githooks/` - secret-scan guard + pre-commit hook
- `LICENSE` - MIT

Everything else in this repository (`app/`, `backend/`, `web_core/`, `omega_ai/`, `claude_engine/`, `main.py`, `site/`, `docs/`, and friends) is **earlier R&D scaffolding kept for history**. It is not the product, is not maintained, and should not be run. The product is exactly the five items above.

## Verify it yourself

```bash
python omega.py --selftest   # 172 checks: router smoke, memory round-trip + corruption
                             # recovery, xlsx ingestion, secret masking, rights/prompt/travel
                             # routing, offline degradation - exit 0 means all pass
```

---
Luqi AI (c) 2026. Built to be verified, not trusted: every release ships with a selftest and a fresh-clone proof.
