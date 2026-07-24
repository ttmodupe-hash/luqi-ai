# Luqi AI v25.2.0 "Modular LUQI" — Dockerfile
# Multi-stage build for production deployment

# ═══════════════════════════════════════════════════════════════════════════════
#  BUILD STAGE
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ═══════════════════════════════════════════════════════════════════════════════
#  PRODUCTION STAGE
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY main.py .
COPY config.py .
COPY router.py .
COPY requirements.txt .
COPY backend/ ./backend/
COPY web_core/ ./web_core/
COPY data/ ./data/

# Create data directories
RUN mkdir -p /app/data/logs /app/data/sandbox /app/data/voice

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
