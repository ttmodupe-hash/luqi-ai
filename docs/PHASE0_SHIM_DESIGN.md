# Phase 0 Shim Design — LUQI 1.0.0 Unification

> Status: DRAFT (design only — no tree moves yet). Blocked on Gate 2 (v5.36.0 push on omega-super-ai).
> Source of truth: `docs/UNIFICATION.md`. Epic: #48.
> Guardrails: no stubs | no fabrication | CI is the gate | never claim integration done until the tree shows it.

## 1. Goal of Phase 0

Restructure the repo into the target tree **without breaking the live Railway deploy** and without breaking the omega engine's module loader. Phase 0 is structure-only: no capability rewrites, no behavior changes.

Target tree:

```
luqi-ai/
├── engine/      # from omega-super-ai (core/, omega/, api_server.py, alembic/, ...)
├── web/         # React app (from app/ + site/ + src/)
├── cli/         # omega.py + .omega_parts (v29.12.1 CLI, lineage A)
├── modules/
│   └── luscious/  # booking platform; 10% non-refundable deposit = server-side law
├── site/        # marketing/static site
├── legacy/      # v25 monolith, trpc-backend, v29 platform (read-only archive)
└── docs/
```

## 2. Railway deploy shim (keep production alive during the move)

**Current deploy facts (verified 2026-09-18):** `railway.toml`, `Dockerfile`, `docker-compose.yml` at repo root; FastAPI serves the built React app from `static/`; port 8080.

**Shim design:**

1. **Root Dockerfile stays, becomes a thin pointer.** It will `COPY engine/`, `COPY web/`, run the web build (`npm --prefix web run build`), and start uvicorn against `engine/` — same exposed port (8080), same health endpoint (`/health`). Railway config (`railway.toml`) keeps pointing at the root Dockerfile, so the Railway service definition never changes.
2. **Static mount shim.** FastAPI's static mount moves from `static/` to `web/dist` (build output). A one-line compatibility mount keeps `/` serving the SPA; no route changes for users.
3. **Zero-downtime rule.** The reorg PR must deploy to a Railway *preview*/staging service first; production flips only after `/health` + one chat round-trip + one module call pass on staging.
4. **Rollback:** keep the pre-reorg commit tagged (`pre-unification-anchor`, already at `b65969b`). Reverting = redeploy that tag.

## 3. Omega loader path shim

**Current loader (v25 monolith):** `_omega(module_name)` tries `omega_ai.MODULE` → root-level module fallback → caches result. After the move, root-level modules live under `engine/` and `legacy/`.

**Shim design (single source: `engine/loader.py`):**

```python
# resolution order, first hit wins
1. engine.omega_ai.<module>      # canonical home after Phase 1
2. engine.<module>               # engine root
3. legacy.<module>               # archived v25 modules, read-only, import-shimmed
```

- `cli/omega.py` and `engine/api_server.py` both import through `engine/loader.py` — one loader, no per-file path hacks.
- `legacy/` modules are importable only through the shim and are logged with a `DEPRECATED-LINEAGE` warning on first import, so we can measure what still depends on legacy before deleting anything.
- Import-time side effects in legacy modules must be audited before the move (known risk: v25 modules that open DB connections at import).

## 4. CI gate repair (prerequisite — currently broken)

- **Blocking defect found 2026-09-18:** workflows live in `.github/workflow/ci.yml` (singular) — GitHub Actions only runs `.github/workflows/`. **CI is currently not running on this repo.** There is also a stray `.github/workflows_test/` directory.
- Phase 0 PR #1 (before any tree move): rename `.github/workflow/` → `.github/workflows/`, delete or fold in `workflows_test/`, and confirm the CI workflow (python 3.10–3.12 matrix, flake8 E9/F63/F7/F82, pytest) goes green on the untouched tree. **"CI is the gate" is currently unenforceable until this lands.**

## 5. Phase 0 execution order (once Gate 2 confirms)

1. **PR-A (CI repair):** fix `.github/workflows/` path; green on current tree. *(not blocked by Gate 2 — can start immediately)*
2. **PR-B (docs):** this design + updated UNIFICATION.md status. *(not blocked)*
3. **PR-C (structure):** `git mv` into target tree + root Dockerfile shim + loader shim. No code edits beyond import paths. *(blocked on Gate 2 — needs v5.36.0 engine content)*
4. **PR-D (verification):** staging deploy checklist + smoke tests (`/health`, chat round-trip, luscious deposit rule test, CLI boot test).

## 6. Explicit non-goals for Phase 0

- No new capabilities (they queue into the issue backlog, #49–#64).
- No deletion of legacy code — archive only.
- No version bump to 1.0.0 (that is Phase 3).
- No claims of "integration done" — the tree must show it first.
