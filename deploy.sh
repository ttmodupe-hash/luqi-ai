#!/usr/bin/env bash
# =============================================================================
# LUQI AI — Deploy Script
# Usage: ./deploy.sh [dev|prod]
# =============================================================================

set -e

MODE="${1:-dev}"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

echo "🚀 LUQI AI Deployment ($MODE mode)"
echo "===================================="

# Check .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env not found. Copying from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
    echo "❌ Please edit $ENV_FILE with your secrets, then re-run."
    exit 1
fi

# Check critical secrets
source "$ENV_FILE"
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change-me-to-a-256-bit-secret-key" ]; then
    echo "❌ JWT_SECRET is not set or is the default value!"
    echo "   Generate one with: openssl rand -hex 32"
    exit 1
fi

# Install Python deps
echo "📦 Installing Python dependencies..."
pip install -q -r "$PROJECT_ROOT/requirements.txt"

# Build frontend
echo "🔨 Building frontend..."
cd "$PROJECT_ROOT/app"
npm install
npm run build

# Copy build to static folder
mkdir -p "$PROJECT_ROOT/static"
cp -r "$PROJECT_ROOT/app/dist/"* "$PROJECT_ROOT/static/"
echo "✅ Frontend built and copied to ./static/"

# Create data directory
mkdir -p "$PROJECT_ROOT/data"

# Run database migrations (if any)
echo "🗄️  Initializing database..."
python -c "
from backend.auth import AuthManager
auth = AuthManager()
print('✅ Auth tables ready')
"

# Start
echo ""
echo "🟢 Starting LUQI AI..."
echo "   Mode: $MODE"
echo "   URL: http://localhost:${PORT:-8080}"
echo ""

if [ "$MODE" = "prod" ]; then
    gunicorn main:app \
        --bind "${HOST:-0.0.0.0}:${PORT:-8080}" \
        --workers "${WORKERS:-2}" \
        --worker-class uvicorn.workers.UvicornWorker \
        --access-logfile - \
        --error-logfile -
else
    uvicorn main:app \
        --host "${HOST:-0.0.0.0}" \
        --port "${PORT:-8080}" \
        --reload \
        --log-level info
fi
