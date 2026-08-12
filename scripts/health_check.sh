#!/bin/bash
# =============================================================================
# LUQI AI - Health Check Script
# =============================================================================
# Comprehensive health check for the LUQI AI platform.
# Checks application, database, Redis, and external dependencies.
# Can be used for Kubernetes liveness/readiness probes or monitoring.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_URL="${APP_URL:-http://localhost:8080}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-luqi_ai}"
DB_USER="${DB_USER:-luqi}"
DB_PASSWORD="${DB_PASSWORD:-}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# ---------------------------------------------------------------------------
# Colors (if terminal supports it)
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log_ok() {
    echo -e "${GREEN}[OK]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $*"
}

# ---------------------------------------------------------------------------
# Check Functions
# ---------------------------------------------------------------------------

check_app_health() {
    local url="$APP_URL/api/v25/health"
    
    if command -v curl >/dev/null 2>&1; then
        if curl -sf "$url" >/dev/null 2>&1; then
            log_ok "Application health endpoint responding"
            return 0
        else
            log_fail "Application health endpoint not responding"
            return 1
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -qO- "$url" >/dev/null 2>&1; then
            log_ok "Application health endpoint responding"
            return 0
        else
            log_fail "Application health endpoint not responding"
            return 1
        fi
    else
        log_warn "Neither curl nor wget available; skipping app health check"
        return 0
    fi
}

check_database() {
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
            log_ok "PostgreSQL is accepting connections"
            return 0
        else
            log_fail "PostgreSQL is not accepting connections"
            return 1
        fi
    elif command -v nc >/dev/null 2>&1; then
        if nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; then
            log_ok "PostgreSQL port is reachable"
            return 0
        else
            log_fail "PostgreSQL port is not reachable"
            return 1
        fi
    else
        log_warn "Neither pg_isready nor nc available; skipping DB check"
        return 0
    fi
}

check_redis() {
    if command -v redis-cli >/dev/null 2>&1; then
        local auth_args=""
        [ -n "$REDIS_PASSWORD" ] && auth_args="-a $REDIS_PASSWORD --no-auth-warning"
        
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_args PING >/dev/null 2>&1; then
            log_ok "Redis is responding to PING"
            return 0
        else
            log_fail "Redis is not responding"
            return 1
        fi
    elif command -v nc >/dev/null 2>&1; then
        if nc -z "$REDIS_HOST" "$REDIS_PORT" >/dev/null 2>&1; then
            log_ok "Redis port is reachable"
            return 0
        else
            log_fail "Redis port is not reachable"
            return 1
        fi
    else
        log_warn "Neither redis-cli nor nc available; skipping Redis check"
        return 0
    fi
}

check_disk_space() {
    local threshold=90
    local usage
    
    usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt "$threshold" ]; then
        log_ok "Disk usage is ${usage}% (threshold: ${threshold}%)"
        return 0
    else
        log_fail "Disk usage is ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

check_memory() {
    local threshold=90
    local usage
    
    if command -v free >/dev/null 2>&1; then
        usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        
        if [ "$usage" -lt "$threshold" ]; then
            log_ok "Memory usage is ${usage}% (threshold: ${threshold}%)"
            return 0
        else
            log_fail "Memory usage is ${usage}% (threshold: ${threshold}%)"
            return 1
        fi
    else
        log_warn "free command not available; skipping memory check"
        return 0
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo "=== LUQI AI Health Check ==="
echo ""

EXIT_CODE=0

check_app_health || EXIT_CODE=1
check_database || EXIT_CODE=1
check_redis || EXIT_CODE=1
check_disk_space || EXIT_CODE=1
check_memory || EXIT_CODE=1

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}=== All checks passed ===${NC}"
else
    echo -e "${RED}=== Some checks failed ===${NC}"
fi

exit $EXIT_CODE
