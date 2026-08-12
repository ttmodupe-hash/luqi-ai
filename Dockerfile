# =============================================================================
# LUQI AI - FastAPI Backend Dockerfile
# =============================================================================
# Multi-stage build for optimized production image.
# - Build stage: Compiles dependencies and prepares the application
# - Production stage: Minimal runtime image with only required artifacts
# =============================================================================

# =============================================================================
# STAGE 1: Base Build Environment
# =============================================================================
FROM python:3.11-slim AS builder

# Set build environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system build dependencies
# - gcc, libc-dev: Compile Python packages with C extensions
# - libpq-dev: PostgreSQL client library for psycopg2
# - curl: Health checks in production
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment for isolated dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
# Copy only requirements first for better Docker layer caching
COPY requirements.txt /tmp/requirements.txt

# Upgrade pip and install dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# =============================================================================
# STAGE 2: Production Runtime
# =============================================================================
FROM python:3.11-slim AS production

# Set production environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    APP_HOME=/app \
    PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR ${APP_HOME}

# Install runtime system dependencies only (no build tools)
# - libpq5: PostgreSQL runtime library
# - curl: Required for health checks
# - ca-certificates: SSL certificate verification
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Create non-root user for security
RUN groupadd -r luqi && useradd -r -g luqi -d ${APP_HOME} -s /sbin/nologin luqi

# Create required directories with proper permissions
RUN mkdir -p \
    ${APP_HOME}/uploads \
    ${APP_HOME}/logs \
    ${APP_HOME}/celerybeat \
    && chown -R luqi:luqi ${APP_HOME}

# Copy application code
# backend/ - Main FastAPI application code
# omega_ai/ - AI model integration modules
COPY --chown=luqi:luqi backend/ ${APP_HOME}/backend/
COPY --chown=luqi:luqi omega_ai/ ${APP_HOME}/omega_ai/

# Copy alembic configuration for database migrations
COPY --chown=luqi:luqi alembic.ini ${APP_HOME}/alembic.ini
COPY --chown=luqi:luqi alembic/ ${APP_HOME}/alembic/

# Switch to non-root user
USER luqi

# Expose the application port
EXPOSE 8080

# Health check - verifies the API status endpoint is responsive
HEALTHCHECK --interval=15s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/api/v25/status || exit 1

# Run the application with uvicorn
# - 4 workers: Optimal for CPU-bound AI workloads on medium instances
# --proxy-headers: Trust X-Forwarded-* headers from Nginx
# --forwarded-allow-ips=*: Allow all forwarded IPs (behind reverse proxy)
CMD ["uvicorn", "backend.main:app", \
    "--host", "0.0.0.0", \
    "--port", "8080", \
    "--workers", "4", \
    "--proxy-headers", \
    "--forwarded-allow-ips", "*", \
    "--access-log", \
    "--log-level", "info"]
