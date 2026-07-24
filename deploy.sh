#!/bin/bash
set -e

echo "================================"
echo "  Luqi AI v25.1.2 Deploy"
echo "================================"

# Install dependencies
echo "[1/5] Installing dependencies..."
pip install -q -r requirements.txt

# Ensure directories
echo "[2/5] Setting up directories..."
mkdir -p data/sandbox data/logs data/web_static

# Run tests
echo "[3/5] Running tests..."
python web_core.py --test || true

# Start server
echo "[4/5] Starting server..."
echo "Admin API key will be saved to data/.admin_key"
echo "Access: http://localhost:8000"
echo ""
python web_core.py --host 0.0.0.0 --port 8000
