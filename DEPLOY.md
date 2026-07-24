# Luqi AI v25.1.2 - Deployment Guide

## Quick Deploy (Local)

```bash
bash deploy.sh
```

## Docker Deploy

```bash
docker-compose up -d
```

## First Startup

On first run, a default admin API key is auto-generated and saved to:
```
data/.admin_key
```

Use this key in the `X-API-Key` header for all authenticated requests.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| OPENAI_API_KEY | - | OpenAI API key |
| LUQI_HOST | 0.0.0.0 | Bind host |
| LUQI_PORT | 8000 | Port |
| LUQI_MODEL | gpt-4o | AI model |
| LUQI_CORS_ORIGINS | * | CORS origins |
| LUQI_ENV | development | Environment |

## API Endpoints

- Web: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Metrics: http://localhost:8000/metrics
