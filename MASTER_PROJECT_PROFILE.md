# MASTER PROJECT PROFILE: LUQI AI v29.1.0 "Prometheus"

> **Document Purpose:** Single source of truth for all architecture, integrations, deployment rules, and critical edge cases. Every future session MUST reference this document before making changes.
> **Last Updated:** 2026-09-18 (re-baselined against the actual tree — see correction log at bottom)
> **Status:** ⚠️ PRE-UNIFICATION — the 3-engine integration has NOT been executed. Authoritative plan: `docs/UNIFICATION.md`. Do not deploy from this profile's old claims; verify against the tree first.

---

## 1. Core Technical Architecture

### 1.1 Frontend
| Attribute | Value | Notes |
|-----------|-------|-------|
| **Framework** | React 18 + TypeScript 5 | SPA (Single Page Application) |
| **Build Tool** | Vite 6 | `npm run build` outputs to `app/dist/` |
| **Styling** | Tailwind CSS 3 + shadcn/ui | Dark theme: `bg-neutral-900`, `text-white`, `border-neutral-800` |
| **Routing** | React Router v7 | routes in `app/src/App.tsx` |
| **State** | React hooks (useState/useEffect) | No Redux/Zustand — intentional simplicity |
| **Icons** | lucide-react | 40+ icons imported |
| **Package** | `luqi-ai-webui` v29.1.0 | `app/package.json` |

### 1.2 Backend
| Attribute | Value | Notes |
|-----------|-------|-------|
| **Framework** | FastAPI (Python 3.11) | `requirements.txt` — `fastapi==0.111.0` |
| **Server** | Uvicorn (dev) / Gunicorn (prod) | `deploy.sh` handles both modes |
| **Language** | Python 3.11 | ⚠️ No Python Dockerfile exists in this repo (see §1.4) |
| **API Pattern** | APIRouter with `prefix="/api/v25"` | All endpoints use `@router.` decorators |
| **Lazy Loader** | `_omega(module_name)` | Tries `omega_ai.MODULE` → root-level fallback → caches result |
| **Endpoint Decorator** | `_omega_endpoint()` | Reduces endpoint boilerplate from 8 lines to 3 |
| **AI Providers** | OpenAI, Anthropic, NVIDIA Nemotron 3.5 Lightning | Nemotron: local/self-hosted via vLLM/TGI/NIM |

### 1.3 Database
| Attribute | Value | Notes |
|-----------|-------|-------|
| **Locked decision (Gate 1)** | **PostgreSQL** | Per `docs/UNIFICATION.md`: one database = Postgres |
| **⚠️ Reality in tree** | `docker-compose.yml` provisions **MySQL 8.0**; `main.py` lifespan uses **SQLite** via `web_core.db` | Compose/stack contradicts the locked decision — resolve in Phase 0 |
| **Cache** | Redis 7 | in docker-compose |

### 1.4 Hosting / Deployment — ⚠️ RE-BASELINED 2026-09-18

| Attribute | Claimed before | **Actual tree** |
|-----------|-------|-------|
| **Docker** | `python:3.11-slim`, port 8080 | Root `Dockerfile` is **Node 20** (`node dist/boot.js`, port 3000) — it builds the tRPC app, NOT the FastAPI backend. No Python Dockerfile exists. |
| **docker-compose** | PostgreSQL 15 | Node app + **MySQL 8.0** + Redis, port 3000 |
| **railway.toml / render.yaml / fly.toml** | FastAPI | All target the **Node/tRPC** app (`node dist/boot.js`, healthcheck `/api/trpc/ping`) |
| **Ports** | 8080 | Sprawl: 3000 (deploy configs) / 8000 (config.py, main.py) / 8080 (old docs) |
| **CI/CD** | "GitHub Actions (3 workflows): backend-ci, frontend-ci, security-scan" | **None of those files exist.** Only `ci.yml`, misplaced in `.github/workflow/` (singular) — **GitHub Actions is NOT running on this repo.** |
| **Static Files** | "Vite dist/ copied to static/" | `static/` does not exist; `main.py` also references `web/v25/` which does not exist. No copy step exists in any build file. |
| **K8s** | 17 YAML manifests | ✅ Accurate — 17 manifests in `k8s/` (incl. postgres StatefulSet, contradicting compose's MySQL) |
| **Current Repo** | `github.com/ttmodupe-hash/luqi-ai` | ✅ Branch: `main` |

---

## 2. Integrated Communication Channels

### 2.1 WebSocket (Real-Time Chat)
| Attribute | Value |
|-----------|-------|
| **URL** | `ws://host:8000/ws/chat` (per main.py; deploy configs say 3000 for the Node app) |
| **Backend** | `main.py` — echo-level implementation |
| **Used By** | ChatPage, NotificationsPage |
| **Fallback** | HTTP polling if WebSocket unavailable |

### 2.2 REST API (Primary)
| Attribute | Value |
|-----------|-------|
| **Base Path** | `/api/v25/` |
| **Total Endpoints** | ⚠️ **Unverified.** The previous claim of "325 endpoints" is not credible: `main.py` mounts `backend/v25_endpoints{,_b,_c}.py` totalling ~23KB, which cannot hold 318 endpoints. The 47KB root `v25_endpoints.py` is a **dead duplicate never imported by main.py**. True count requires running the app. |
| **Auth Header** | `Authorization: Bearer <token>` |
| **API Key** | `X-API-Key` header (dev fallback: `dev-key-change-in-prod`) |
| **CORS** | Configured via `CORS_ORIGINS` env var |

### 2.3 Nemotron integration
Claims in the previous revision (8 live endpoints, GPU compose profile) are **unverified against the tree** — treat as aspirational until Phase 1 of the unification mounts and tests them. See issue queue item UNIFY-08.

---

## 3. Known Defects (from 2026-09-18 audit — fixed/tracked)

| Defect | Status |
|--------|--------|
| `backend/router.py` + `backend/education_endpoints.py` were 13-byte `PASTE_CONTENT` placeholders | ✅ Fixed in PR #66 (router restored from history; education module = lost local delta, rebuild queued) |
| CI not running (workflow dir misnamed) | ⏳ Fix ready — needs `workflow` token scope or local `git mv .github/workflow .github/workflows` |
| Domain `luqi-ai.com` serves GitHub Pages 404 | ⏳ Fix in progress (Pages landing + DNS decision) |
| ~120 root-level modules are demo-grade (in-memory, no persistence) | 📋 Queued — Phase 1 harvest decides real vs archive |
| `pyproject.toml` describes package `claude-engine` | 📋 Leftover from `claude_engine/` subproject — resolve in Phase 0 |

---

## 4. Marketing & Subscriber Acquisition

### 4.1 Value Proposition (draft — validate before use)
- AI capabilities for South Africa: finance, tenders, load shedding, health, education
- Local AI inference option — data stays private
- Long-context document handling

⚠️ Do NOT publish capability counts ("90+ capabilities", "325 endpoints") until verified against the running app — the 2026-09-18 audit found these numbers unverifiable.

### 4.2 Pricing Tiers (Proposed)
| Tier | Price | Features |
|------|-------|----------|
| Free | R0 | 50 requests/day, basic capabilities |
| Pro | R199/mo | Unlimited requests, priority support |
| Enterprise | Custom | Self-hosted, SLA, custom models |

---

## Correction log

- **2026-09-18:** Re-baselined §1.3, §1.4, §2.2, §2.3 against the actual tree. Removed "Deployment-Ready" status (contradicted by `docs/UNIFICATION.md`: "integration NOT yet executed"). Previous revision claimed 3 nonexistent CI workflows, a nonexistent Python Dockerfile, PostgreSQL-in-compose (actually MySQL), and 325 endpoints (unverifiable). Full audit: repo issue epic #48 and the 2026-09-18 health audit report.

*End of MASTER_PROJECT_PROFILE.md — v29.1.0 (pre-unification)*
