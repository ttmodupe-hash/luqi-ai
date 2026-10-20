#!/usr/bin/env bash
set -e

PORT="${PORT:-3000}"
export PORT
export HOST="0.0.0.0"

echo "=========================================================="
echo " Starting LUQI AI / Omega Super AI Runtime"
echo " Host:        0.0.0.0"
echo " Port:        ${PORT}"
echo "=========================================================="

# 1. If compiled production Node.js distribution exists, start it
if [ -f "dist/boot.js" ]; then
    echo "[start.sh] Launching Node.js engine on 0.0.0.0:${PORT} (dist/boot.js)..."
    exec node dist/boot.js
fi

# 2. If TypeScript source entrypoint exists, launch via tsx
if [ -f "api/boot.ts" ]; then
    echo "[start.sh] Launching TypeScript runtime on 0.0.0.0:${PORT} (api/boot.ts)..."
    if command -v tsx >/dev/null 2>&1; then
        exec tsx api/boot.ts
    elif command -v npx >/dev/null 2>&1; then
        exec npx tsx api/boot.ts
    fi
fi

# 3. Otherwise launch Python FastAPI / Uvicorn server
if [ -f "main.py" ]; then
    echo "[start.sh] Launching Python Uvicorn engine on 0.0.0.0:${PORT} (main:app)..."
    if command -v python3 >/dev/null 2>&1; then
        exec python3 -m uvicorn main:app --host 0.0.0.0 --port "${PORT}"
    else
        exec uvicorn main:app --host 0.0.0.0 --port "${PORT}"
    fi
fi

echo "[start.sh] ERROR: Neither dist/boot.js, api/boot.ts, nor main.py found."
exit 1
