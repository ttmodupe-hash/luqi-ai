# MASTER PROJECT PROFILE: LUQI AI v29.1.0 "Prometheus"

> **Document Purpose:** Single source of truth for all architecture, integrations, deployment rules, and critical edge cases. Every future session MUST reference this document before making changes.
> **Last Updated:** 2026-08-12
> **Status:** Deployment-Ready (Nemotron 3.5 Lightning integrated, 48+ files committed)

---

## 1. Core Technical Architecture

### 1.1 Frontend
| Attribute | Value | Notes |
|-----------|-------|-------|
| **Framework** | React 18 + TypeScript 5 | SPA (Single Page Application) |
| **Build Tool** | Vite 6 | `npm run build` outputs to `app/dist/` |
| **Styling** | Tailwind CSS 3 + shadcn/ui | Dark theme: `bg-neutral-900`, `text-white`, `border-neutral-800` |
| **Routing** | React Router v7 | 94 routes in `App.tsx` |
| **State** | React hooks (useState/useEffect) | No Redux/Zustand — intentional simplicity |
| **Icons** | lucide-react | 40+ icons imported |
| **Package** | `luqi-ai-webui` v29.1.0 | `app/package.json` |

### 1.2 Backend
| Attribute | Value | Notes |
|-----------|-------|-------|
| **Framework** | FastAPI (Python 3.11) | `requirements.txt` — `fastapi==0.111.0` |
| **Server** | Uvicorn (dev) / Gunicorn (prod) | `deploy.sh` handles both modes |
| **Language** | Python 3.11 | Docker: `python:3.11-slim` |
| **API Pattern** | APIRouter with `prefix="/api/v25"` | All endpoints use `@router.` decorators |
| **Lazy Loader** | `_omega(module_name)` | Tries `omega_ai.MODULE` → root-level fallback → caches result |
| **Endpoint Decorator** | `_omega_endpoint()` | Reduces endpoint boilerplate from 8 lines to 3 |
| **AI Providers** | OpenAI, Anthropic, NVIDIA Nemotron 3.5 Lightning | Nemotron: local/self-hosted via vLLM/TGI/NIM |

### 1.3 Database
| Attribute | Value | Notes |
|-----------|-------|-------|
| **Primary** | PostgreSQL 15 + asyncpg | `docker-compose.yml` with health checks |
| **Fallback** | SQLite 3 | `data/luqi.db` — auto-created on first run |
| **Tables** | 13+ | users, feedback, activity_log, capability_usage + module-specific tables |
| **Pattern** | SQLAlchemy 2.0 async ORM | Migrations via Alembic |
| **Cache** | Redis 7 | Celery broker, session store, feature flags |

### 1.4 Hosting / Deployment
| Attribute | Value | Notes |
|-----------|-------|-------|
| **Docker** | `Dockerfile` + `docker-compose.yml` | Port 8080, health checks, depends_on |
| **Kubernetes** | 17 YAML manifests | StatefulSet for PostgreSQL, HPA 2-20 replicas, Ingress with TLS |
| **Deploy Script** | `scripts/setup_production.sh [dev|prod]` | One-command: env check → deps → build → init DB → start |
| **Makefile** | 10 targets | `make dev`, `make prod`, `make test`, `make status` |
| **CI/CD** | GitHub Actions (3 workflows) | `backend-ci.yml`, `frontend-ci.yml`, `security-scan.yml` |
| **Static Files** | `static/` directory | Vite `dist/` copied here; served by FastAPI `mount_static()` |
| **Current Repo** | `github.com/ttmodupe-hash/luqi-ai` | Branch: `main` |

---

## 2. Integrated Communication Channels

### 2.1 WebSocket (Real-Time Chat)
| Attribute | Value |
|-----------|-------|
| **URL** | `ws://host:8080/ws/chat` (env: `VITE_WS_URL`) |
| **Frontend Hook** | `useWebSocket(sessionId)` in `app/src/hooks/useWebSocket.ts` |
| **Backend** | `main.py` — FastAPI `WebSocketEndpoint` |
| **Used By** | ChatPage, NotificationsPage |
| **Fallback** | HTTP polling if WebSocket unavailable |

### 2.2 Server-Sent Events (AI Streaming)
| Attribute | Value |
|-----------|-------|
| **Endpoint** | `POST /api/v25/ai-brain/chat/stream` |
| **Backend** | `StreamingResponse` in `v25_endpoints_c.py` |
| **Format** | `text/event-stream` — JSON chunks per token |
| **LLM** | OpenAI GPT-4o-mini with streaming / Nemotron 3.5 Lightning |
| **Fallback** | Keyword routing if OpenAI unavailable |

### 2.3 REST API (Primary)
| Attribute | Value |
|-----------|-------|
| **Base Path** | `/api/v25/` |
| **Total Endpoints** | **325** across 3 router files + Nemotron provider |
| **Router Files** | `v25_endpoints.py` (61), `v25_endpoints_b.py` (115), `v25_endpoints_c.py` (142), `nemotron_provider.py` (7) |
| **Auth Header** | `Authorization: Bearer <token>` |
| **API Key** | `X-API-Key` header (dev fallback: `dev-key-change-in-prod`) |
| **CORS** | Configured via `CORS_ORIGINS` env var |

---

## 3. NVIDIA Nemotron 3.5 Lightning Integration

### 3.1 Capabilities
| Feature | Status | Endpoint |
|---------|--------|----------|
| Chat completion | ✅ Live | `POST /api/v25/nemotron/chat` |
| Streaming (SSE) | ✅ Live | `POST /api/v25/nemotron/chat?stream=true` |
| Async chat | ✅ Live | `POST /api/v25/nemotron/chat/async` |
| Tool calling | ✅ Live | `POST /api/v25/nemotron/tools` |
| Structured output (JSON) | ✅ Live | `POST /api/v25/nemotron/structured` |
| Token counting | ✅ Live | `POST /api/v25/nemotron/token-count` |
| Model listing | ✅ Live | `GET /api/v25/nemotron/models` |
| Health check | ✅ Live | `GET /api/v25/nemotron/health` |

### 3.2 Architecture
- **Client**: `omega_ai/nemotron_client.py` — AsyncOpenAI wrapper with circuit breaker, retry logic, 1M context truncation
- **Provider**: `backend/nemotron_provider.py` — FastAPI router with Pydantic models, tenacity retries, structlog
- **Deployment**: Docker Compose profile `nemotron` with GPU reservation; Kubernetes GPU node selector
- **Models**: `nvidia/nemotron-3.5-lightning` (1M context), `nvidia/nemotron-3.5-8b-instruct` (131K context)

### 3.3 Environment Variables
```bash
ENABLE_NEMOTRON=true
NEMOTRON_API_KEY=not-needed-for-local
NEMOTRON_BASE_URL=http://localhost:8000/v1
NEMOTRON_MODEL=nvidia/nemotron-3.5-lightning
NEMOTRON_MAX_TOKENS=32768
NEMOTRON_CONTEXT_WINDOW=1048576
```

---

## 4. Deployment Checklist

### 4.1 Docker Compose (Recommended for first deploy)
```bash
# 1. Clone
git clone https://github.com/ttmodupe-hash/luqi-ai.git
cd luqi-ai

# 2. Configure
cp .env.example .env
# Edit .env with your API keys

# 3. Deploy
make prod
# Or: docker-compose up -d

# 4. With Nemotron (requires NVIDIA GPU)
docker-compose --profile nemotron up -d
```

### 4.2 Kubernetes
```bash
kubectl apply -f k8s/
```

### 4.3 Verification
```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/v25/nemotron/health
```

---

## 5. Marketing & Subscriber Acquisition

### 5.1 Value Proposition
- **90+ AI capabilities** for South Africa: finance, tenders, load shedding, health, education
- **Local AI inference** with Nemotron 3.5 Lightning — data stays private
- **1M context window** for long documents and extended conversations
- **Open weights** — customize and deploy anywhere

### 5.2 Launch Channels
1. **Product Hunt** — AI/LLM category, emphasize local deployment angle
2. **Hacker News** — "Show HN" post highlighting Nemotron + SA context
3. **South African tech communities** — ZATech Slack, Offerzen, DevConf
4. **NVIDIA Developer Forums** — Nemotron showcase
5. **Twitter/X** — Daily capability demos, load shedding insights, tender alerts

### 5.3 Pricing Tiers (Proposed)
| Tier | Price | Features |
|------|-------|--------|
| Free | R0 | 50 requests/day, basic capabilities |
| Pro | R199/mo | Unlimited requests, Nemotron local, priority support |
| Enterprise | Custom | Self-hosted, SLA, custom models |

---

*End of MASTER_PROJECT_PROFILE.md — v29.1.0*
