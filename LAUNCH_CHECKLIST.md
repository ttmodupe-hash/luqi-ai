# LAUNCH_CHECKLIST.md - LUQI AI v29.3.0 "Launch-Grade" runbook

Human launch runbook for omega.py v29.3.0. Every step is CLI-only,
stdlib-only, and safe to re-run. ASCII document.

## 1. Engine selftest (blocker)

    cd <clean workdir>
    python3 omega.py --selftest        # Windows: py -3.11 omega.py --selftest

- Expected: ALL checks PASS (48+ legacy checks plus the v29.3.0
  process-isolation, bridge, language-pack, and launch checks), exit code 0.
- Run twice; results must be identical (idempotent).
- DO NOT LAUNCH if any check prints FAIL.

## 2. .env keys (optional - WARN, not blockers)

Create `.env` next to omega.py with any of:

    OPENAI_API_KEY=sk-...            # LLM-enhanced tax guidance + bridge primary
    ANTHROPIC_API_KEY=sk-ant-...     # bridge fallback provider (optional)
    OMEGA_LLM_MODEL=gpt-4o-mini      # bridge primary model (optional)
    SERPER_API_KEY=...               # live web research
    OPENROUTER_API_KEY=...           # 'evolve run online' proposals
    OPENROUTER_MODEL=openai/gpt-4o-mini
    GITHUB_REPO=owner/repo           # 'sync github' push target
    GITHUB_TOKEN=ghp_...             # git push credentials (always masked)

Optional claude_engine bridge: clone the claude_engine repo and run
`pip install -e .` inside it. The engine works fully without it - check
status any time with the `bridge` command.

## 3. Launch pre-flight (blocker)

    python3 omega.py
    [OMEGA] > launch

- Expected final line: `LAUNCH READY`.
- Blockers are ONLY: pillars integrity failure, memory not writable,
  selftest-core failure. Fix and re-run until `LAUNCH READY`.
- Missing optional keys print WARN and never block.

## 4. Push to GitHub

    [OMEGA] > sync status     # confirm git + GITHUB_REPO configured
    [OMEGA] > sync github     # git add + commit + push

- Confirm the push line reports `ok`. The token is masked in all output.

## 5. Website publish

- Publish the website via the platform publish button (the Chinese-labelled
  "fa bu" button) on the deployment platform.
- Wait for the deploy to report success before smoke testing.

## 6. Post-publish smoke

- Visit the live site.
- Confirm the version badge reads v29.3.0.
- Click through the main panels once; confirm no error banners.

## 7. Rollback note

- Website: re-publish the previous website version from the platform's
  version history.
- Engine: every prior state is recoverable - `git log` / `git checkout`
  for omega.py, `evolve rollback` inside the CLI for the strategy module,
  and `omega_memory.json.bak` for a corrupted memory file.

## Sign-off

- [ ] selftest ALL PASS, exit 0, run twice
- [ ] `launch` prints LAUNCH READY
- [ ] `sync github` pushed
- [ ] site published, badge shows v29.3.0
- [ ] rollback path confirmed (site version history + git history)
