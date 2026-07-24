# Luqi AI v25.1.2 "Prometheus . LUQI"

Unified Web/Desktop/Mobile Intelligence Platform

## Quick Start

```bash
pip install -r requirements.txt
python web_core.py
# Admin API key auto-saved to data/.admin_key
```

## Statistics

| Metric | Count |
|--------|-------|
| Lines | 3,139 |
| Classes | 15 |
| Endpoints | 52 |
| Capabilities | 71 (65 active, 6 planned) |
| Tests | 38/38 passing |
| Dashboard Tabs | 8 |

## Key Features

- **YouTube Creation Suite** - AI campaigns, SEO, thumbnails, marketing
- **Wealth & Brand Accelerator** - Pricing, funnels, sponsorship, revenue
- **Security** - API key auth, rate limiting, CORS, request logging
- **Admin Panel** - Stats, diagnostics, key management, export
- **WebSocket Real-Time Chat**
- **Multi-Model AI** - GPT-4o, GPT-4o-mini, Claude, Local Llama
- **Prometheus /metrics**
- **Sentiment Analysis & Translation**
- **Webhook System**
- **Dark/Light Theme**
- **Desktop App** (`--desktop` flag)
- **Mobile PWA** - Installable, offline, responsive

## Auth

Default admin key auto-generated to `data/.admin_key`. Set `X-API-Key` header.

## Endpoints

Public: `/health`, `/metrics`, `/auth/me`, `/manifest.json`, `/sw.js`, `/docs`, `/models`
Auth: `/chat`, `/upload`, `/voice/*`, `/search`, `/youtube/*`, `/wealth/*`, `/translate`, `/sentiment`, `/export/*`
Admin: `/admin/*`, `/auth/keys`, `/auth/stats`, `/auth/logs`, `/webhooks`, `/ws/clients`
WebSocket: `/ws/chat?session_id=xxx`

## Deploy

```bash
bash deploy.sh
# or
docker-compose up -d
```

---
Built by Luqi AI Team
