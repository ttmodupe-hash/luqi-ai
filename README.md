# LUQI AI Lab Simulator

**Pan-African + Global AI Education Platform** — Interactive STEM labs, multi-language i18n, self-healing architecture, and AI video generation.

---

## Features

- **Lab Simulator**: 7 interactive physics/chemistry/biology labs with real-time calculations
- **13 Curriculum Frameworks**: South Africa CAPS, Kenya CBC, Nigeria NERDC, Ghana NaCCA, Rwanda REB, Zimbabwe ZIMSEC, Germany Abitur, UK Cambridge, Russia MIPT, Japan SSH, China Gaokao, EU Cambridge, USA ABET
- **21 Languages**: All 12 South African official + Swahili, French, Portuguese, Hausa, Yoruba, Igbo, Amharic, German, Russian, Japanese, Chinese
- **AI Orchestrator**: Multi-provider failover (OpenAI → Anthropic → Google) with intent classification
- **Self-Healing Engine**: AI-powered error detection, patch generation, auto-rollback, predictive analytics
- **Video Studio**: AI video project management with status lifecycle tracking
- **Ethnobotanical**: 30+ traditional medicine plants with safety data

---

## Quick Start

```bash
# Clone
git clone https://github.com/ttmodupe-hash/luqi-ai.git
cd luqi-ai

# Configure
cp .env.example .env
nano .env  # Add your API keys

# Start with Docker
docker-compose up -d

# Or run locally
npm install
npm run db:push
npm run build
npm start
```

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for complete guides:

| Platform | Config File | Time |
|----------|-------------|------|
| Docker Compose | `docker-compose.yml` | 2 min |
| Railway | `railway.toml` | 5 min |
| Render | `render.yaml` | 5 min |
| Fly.io | `fly.toml` | 10 min |
| VPS (Ubuntu) | `scripts/vps-deploy.sh` | 15 min |
| GitHub Actions | `.github/workflows/deploy.yml` | Auto |

---

## API Endpoints

### Labs
```
POST /api/trpc/labs.list
POST /api/trpc/labs.getFramework
POST /api/trpc/labs.getBlueprint
POST /api/trpc/labs.runCalculations
POST /api/trpc/labs.translateUI
POST /api/trpc/labs.translateBlueprint
```

### Self-Healing
```
POST /api/trpc/selfHealing.logError
POST /api/trpc/selfHealing.analyzeAndProposePatch
POST /api/trpc/selfHealing.applyPatch
POST /api/trpc/selfHealing.rollbackPatch
POST /api/trpc/selfHealing.predictFailures
POST /api/trpc/selfHealing.runSupervisorScan
POST /api/trpc/selfHealing.runFullHealthCheck
```

### Video Studio
```
POST /api/trpc/video.create
POST /api/trpc/video.list
POST /api/trpc/video.generate
POST /api/trpc/video.stats
```

### AI Orchestrator
```
POST /api/trpc/orchestrator.generate
POST /api/trpc/orchestrator.classify
POST /api/trpc/orchestrator.status
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | Yes | Server port (default: 3000) |
| `APP_ID` | Yes | Application identifier |
| `APP_SECRET` | Yes | Secure secret for sessions |
| `DATABASE_URL` | Yes | MySQL connection string |
| `REDIS_URL` | No | Redis connection string |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key |
| `GEMINI_API_KEY` | Yes* | Google Gemini API key |
| `SERPER_API_KEY` | No | Web search API key |

*At least one AI provider required.

---

## License

MIT
