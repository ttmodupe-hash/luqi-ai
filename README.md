# Omega AI v29.1.0

> **Unified AI Platform for Africa** — A multi-agent, multi-modal intelligence system with 150+ capabilities, local LLM support, federated learning, blockchain audit trails, and comprehensive South African service integrations.

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ttmodupe-hash/luqi-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ttmodupe-hash/luqi-ai/actions)

## Quick Start

```bash
# Clone and setup
git clone https://github.com/ttmodupe-hash/luqi-ai.git
cd luqi-ai
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

# Run the API server
python api_server.py
```

## Architecture

```
Omega AI
├── Core Brain (omega_ai.py, core_brain.py, ai_brain.py)
├── Agent Mesh (agent_mesh.py) — Multi-agent orchestration
├── Memory System (memory_manager.py, memory_store.py)
├── Knowledge Base (knowledge_base.py, vector_db.py)
├── Plugin System (plugin_registry.py, plugin_marketplace.py, omega_plugins.py)
├── API Layer (api_server.py, ws_server.py)
├── Web UI (web_ui/) — Progressive Web App
├── Services (150+ specialized modules)
│   ├── Agriculture, Mining, Construction
│   ├── Finance, Tax, Insurance, Loans
│   ├── Health, Education, Sports
│   ├── Transport, Housing, Government
│   └── Entertainment, Travel, Weather
└── Infrastructure
    ├── Auth (auth_middleware.py)
    ├── Cache (cache_manager.py)
    ├── DB (db_engine.py, db_layer.py)
    ├── Scheduler (scheduler.py)
    └── Export (export_formats.py, pdf_generator.py)
```

## Key Features

| Category | Modules |
|----------|---------|
| **Core AI** | Brain, Memory, Knowledge, Conversation, Skills |
| **Agriculture** | Crop advisor, Livestock, Farming guide, Solar, Water |
| **Business** | Registration, CRM, Project, Inventory, Invoice, HR |
| **Finance** | Tax, Insurance, Loans, Investment, Price ticker |
| **Health** | Advisor, Directory, Mental health, Nutrition |
| **Education** | OmniLab, Pedagogical, Vocational, University guide |
| **Government** | Services, Housing, Tender, Legal, CA assistant |
| **Infrastructure** | Load shedding, Transport, Vehicle, Mobile data |
| **Security** | Cybersecurity, Blockchain audit, Key rotation |
| **Communication** | Email, Telegram, WhatsApp, Notification |
| **Research** | Web search, Deep research, News, Citation |
| **Integration** | Local LLM, Federated learning, Multi-tenant |

## API Documentation

OpenAPI spec available at `/openapi.yaml`. Start the server and visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing

```bash
pytest -xvs tests/
```

## Docker

```bash
docker-compose up --build
```

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) — Copyright (c) 2024-2025 Omega AI / Luqi AI
