# Luqi AI v25.2.0 "Modular LUQI"

> **Unified AI Platform** — One codebase serves Web, Desktop, and Mobile

## Quick Start

```bash
# Clone
git clone https://github.com/ttmodupe-hash/luqi-ai.git
cd luqi-ai

# Install dependencies
pip install -r requirements.txt

# Set your OpenAI API key (optional — works in offline mode too)
export OPENAI_API_KEY="sk-..."

# Start the web server
python -m web_core.routes

# Or start with desktop app
python -m web_core.routes --desktop

# Run tests
python -m web_core.tests.run_all
```

## Architecture

LUQI has been refactored from a 3,139-line monolith into a clean, modular architecture:

```
luqi-ai/
├── web_core/                    # NEW v25.2.0 — Refactored modular core
│   ├── __init__.py              # Package init, version
│   ├── models.py                # Dataclasses & enums (ChatMessage, CapabilityItem, etc.)
│   ├── interfaces.py            # ABCs (FileParser, TTSProvider, Authenticator, etc.)
│   ├── config.py                # Centralized settings
│   ├── routes.py                # Thin FastAPI route layer (~350 lines)
│   ├── desktop.py               # PyQt6 desktop wrapper
│   ├── db/                      # Persistence layer
│   │   ├── connection.py        # Thread-safe SQLite pool
│   │   ├── conversations.py     # Chat history CRUD
│   │   ├── documents.py         # Upload & sandbox logs
│   │   └── capabilities.py      # 71 capability/feature flags
│   ├── engines/                 # Business logic (no HTTP, no DB)
│   │   ├── document.py          # Strategy-pattern file parsing (PDF, DOCX, XLSX, etc.)
│   │   ├── voice.py             # STT/TTS with swappable providers
│   │   ├── youtube.py           # Campaign, script, thumbnail generation
│   │   └── wealth.py            # Funnel, sponsor, pricing generation
│   ├── agents/                  # Orchestration (engines + stores)
│   │   ├── chat.py              # AI chat with multi-model support
│   │   ├── document.py          # File upload & parsing
│   │   ├── voice.py             # Voice operations
│   │   ├── youtube.py           # YouTube creation suite
│   │   ├── wealth.py            # Wealth creation engine
│   │   └── system.py            # Health, metrics, self-improvement
│   ├── security/                # Auth, rate limiting, audit
│   │   ├── auth.py              # SHA-256 API key management
│   │   ├── rate_limit.py        # Token bucket algorithm
│   │   └── audit.py             # Request logging
│   └── tests/                   # 46 tests across 4 test files
│       ├── test_memory.py       # DB store tests
│       ├── test_engines.py      # Engine tests
│       ├── test_security.py     # Auth & rate limit tests
│       ├── test_system.py       # System agent tests
│       └── run_all.py           # Test runner
│
├── web_core.py                  # LEGACY v25.1.2 — Original monolith (3,139 lines)
├── main.py                      # App factory entrypoint
├── config.py                    # Legacy settings
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Docker image
├── docker-compose.yml           # Full stack deployment
├── deploy.sh                    # One-command deploy
├── data/
│   └── web_static/
│       └── index.html           # PWA dashboard (8 tabs, offline support)
│
├── router.py                    # API router middleware
├── v25_endpoints.py             # v25 API endpoints
├── safety_alignment.py          # AI safety & alignment controls
├── physics_simulator.py         # Physics simulation engine
├── luqi_personal_ai.py          # Standalone personal AI assistant
├── luqi_sandbox_gui.py          # Desktop sandbox GUI (PyQt6)
└── backend/                     # Additional backend modules
    ├── digital_workspace.py
    ├── government_services.py
    ├── jobs_skills.py
    ├── netai_training.py
    ├── project_management.py
    └── whatsapp_bot.py
```

## Capabilities — 71 Features

| Category | Active | Planned |
|----------|--------|---------|
| Core | 10 | 0 |
| Voice | 3 | 2 |
| Advanced | 9 | 3 |
| Content | 5 | 2 |
| Platform | 3 | 2 |
| Security | 5 | 1 |
| Utility | 10 | 4 |
| Monitoring | 3 | 0 |
| UI | 3 | 0 |
| PWA | 2 | 2 |
| Wealth | 8 | 2 |
| **Total** | **61** | **6** |

### Key Features

- **Multi-Model AI** — GPT-4o, GPT-4o-mini, GPT-4-Turbo, Claude Sonnet/Haiku, Local Llama
- **Persistent Memory** — SQLite-backed conversation history with session management
- **Document Parsing** — PDF, DOCX, XLSX, TXT, JSON, CSV, Python, Images
- **Voice** — Text-to-Speech (8 accents including Nigerian) + Speech-to-Text
- **YouTube Suite** — Campaign generation, script outlines, thumbnail prompts, SEO strategy
- **Wealth Engine** — Sales funnels, sponsor finding, pricing tier optimization
- **Security** — SHA-256 API keys, admin roles, token bucket rate limiting, audit logging
- **PWA** — Service worker, offline support, installable on iOS/Android
- **Desktop** — PyQt6 WebEngine wrapper (`--desktop` flag)
- **Self-Improvement** — AST-based code analysis and improvement reports

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | Public | PWA Dashboard |
| `/health` | GET | Public | System health |
| `/config` | GET | Public | Available models, accents, doc types |
| `/chat` | POST | API Key | AI chat completion |
| `/ws/chat` | WS | API Key | WebSocket real-time chat |
| `/upload` | POST | API Key | File upload & parse |
| `/voice/tts` | POST | API Key | Text-to-speech |
| `/voice/stt` | POST | API Key | Speech-to-text |
| `/youtube/campaign` | POST | API Key | Generate campaign |
| `/youtube/thumbnail` | POST | API Key | Thumbnail prompt |
| `/youtube/script` | POST | API Key | Script outline |
| `/wealth/funnel` | POST | API Key | Sales funnel |
| `/wealth/sponsors` | POST | API Key | Find sponsors |
| `/wealth/pricing` | POST | API Key | Pricing tiers |
| `/capabilities` | GET | API Key | List all capabilities |
| `/self-improve/report` | GET | API Key | Improvement report |
| `/self-improve/analyze` | GET | API Key | Code analysis |
| `/admin/keys` | GET | Admin | List API keys |
| `/admin/stats` | GET | Admin | System stats |
| `/metrics` | GET | Public | Prometheus metrics |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key for AI features |
| `LUQI_ADMIN_KEY` | — | Master admin key (bypasses DB) |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

## Testing

```bash
# Run all 46 tests
python -m web_core.tests.run_all

# Run specific test modules
python -m unittest web_core.tests.test_memory -v
python -m unittest web_core.tests.test_engines -v
python -m unittest web_core.tests.test_security -v
python -m unittest web_core.tests.test_system -v
```

## Deployment

```bash
# Docker
docker-compose up -d

# Or use the deploy script
bash deploy.sh
```

## Version History

| Version | Codename | Key Changes |
|---------|----------|-------------|
| v25.2.0 | Modular LUQI | Refactored from monolith to clean architecture — 33 modules, 46 tests |
| v25.1.2 | Prometheus | Unified web_core.py — 71 capabilities, 38 tests |
| v25.1.1 | Hermes | Personal AI + sandbox GUI integration |
| v25.1.0 | LUQI | JARVIS→LUQI rename, dashboard, unified agent |
| v25.0.0 | Atlas | Major backend integration, wealth engine |

## License

MIT
