# LUQI AI — Deployment Guide

Complete deployment instructions for all platforms.

---

## Quick Start (Docker Compose — Recommended)

```bash
git clone https://github.com/ttmodupe-hash/luqi-ai.git
cd luqi-ai
cp .env.example .env
nano .env  # Add your API keys
docker-compose up -d
```

This starts:
- **LUQI AI app** on port 3000
- **MySQL 8.0** on port 3306
- **Redis 7** on port 6379

---

## Platform 1: Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Then add MySQL database in Railway dashboard and set env vars.

---

## Platform 2: Render

1. Push to GitHub
2. Go to https://dashboard.render.com/blueprints
3. Connect repo → Auto-detects `render.yaml`
4. Set secrets in dashboard

---

## Platform 3: Fly.io

```bash
fly auth login
fly launch
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set GEMINI_API_KEY=...
fly deploy
fly open
```

---

## Platform 4: VPS (AWS/DigitalOcean/Hetzner)

```bash
# One-line auto-deploy
wget -O - https://raw.githubusercontent.com/ttmodupe-hash/luqi-ai/main/scripts/vps-deploy.sh | bash

# Or manually
sudo bash scripts/vps-deploy.sh
```

---

## Platform 5: GitHub Actions

1. Push to GitHub
2. Add secrets in repo Settings → Secrets
3. Push to main branch → Auto-deploys

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | Server port (default: 3000) |
| `APP_ID` | Yes | Application identifier |
| `APP_SECRET` | Yes | Secure secret for sessions |
| `DATABASE_URL` | Yes | MySQL connection string |
| `REDIS_URL` | No | Redis connection string |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key |
| `GEMINI_API_KEY` | Yes* | Google Gemini API key |
| `SERPER_API_KEY` | No | Web search API key |

---

## Database Migrations

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Push schema directly (dev only)
npm run db:push
```

---

## Troubleshooting

### "Cannot connect to database"
```bash
# Check MySQL is running
sudo systemctl status mysql

# Verify connection string format
# mysql://user:password@host:port/database
```

### "Build fails"
```bash
rm -rf node_modules dist
npm ci
npm run build
```

### "Port already in use"
```bash
lsof -i :3000
kill -9 <PID>

# Or change port
PORT=3001 npm start
```

---

## Production Checklist

- [ ] `.env` configured with all API keys
- [ ] Database migrated (`npm run db:push`)
- [ ] Redis running (for caching)
- [ ] SSL certificate installed
- [ ] Firewall configured (ports 80, 443, 3000)
- [ ] PM2/process manager configured
- [ ] Logs rotation set up
- [ ] Backups scheduled
- [ ] Monitoring enabled (self-healing dashboard)
- [ ] Domain DNS pointed to server
