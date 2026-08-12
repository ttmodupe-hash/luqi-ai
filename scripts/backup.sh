#!/bin/bash
# =============================================================================
# LUQI AI - Backup Script
# =============================================================================
# Performs automated backups of PostgreSQL database and Redis data.
# Supports local backups and S3-compatible remote storage.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BACKUP_DIR="/var/backups/luqi-ai"
S3_BUCKET="${S3_BUCKET:-}"            # e.g., s3://my-backups/luqi-ai
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-luqi_ai}"
DB_USER="${DB_USER:-luqi}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Redis configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

# ---------------------------------------------------------------------------
# Pre-flight Checks
# ---------------------------------------------------------------------------
log "Starting LUQI AI backup..."

mkdir -p "$BACKUP_DIR"

command -v pg_dump >/dev/null 2>&1 || error "pg_dump not found. Install postgresql-client."
command -v redis-cli >/dev/null 2>&1 || error "redis-cli not found. Install redis-tools."

# ---------------------------------------------------------------------------
# PostgreSQL Backup
# ---------------------------------------------------------------------------
log "Backing up PostgreSQL database..."

PGPASSFILE=$(mktemp)
echo "$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD" > "$PGPASSFILE"
chmod 600 "$PGPASSFILE"

export PGPASSFILE

PG_BACKUP_FILE="$BACKUP_DIR/postgres_${DB_NAME}_${TIMESTAMP}.sql.gz"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose --no-owner --no-privileges \
    | gzip > "$PG_BACKUP_FILE"

rm -f "$PGPASSFILE"

log "PostgreSQL backup complete: $PG_BACKUP_FILE"

# ---------------------------------------------------------------------------
# Redis Backup
# ---------------------------------------------------------------------------
log "Backing up Redis data..."

REDIS_BACKUP_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

if [ -n "$REDIS_PASSWORD" ]; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning LASTSAVE
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning BGSAVE
else
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
fi

# Wait for BGSAVE to complete
sleep 5

# Copy RDB file (location depends on Redis configuration)
# This is a simplified example; adjust for your Redis setup
log "Redis backup complete (BGSAVE triggered)"

# ---------------------------------------------------------------------------
# Upload to S3 (if configured)
# ---------------------------------------------------------------------------
if [ -n "$S3_BUCKET" ]; then
    log "Uploading backups to S3..."
    
    command -v aws >/dev/null 2>&1 || error "AWS CLI not found."
    
    aws s3 cp "$PG_BACKUP_FILE" "$S3_BUCKET/postgres/" --storage-class STANDARD_IA
    
    log "S3 upload complete."
fi

# ---------------------------------------------------------------------------
# Cleanup Old Backups
# ---------------------------------------------------------------------------
log "Cleaning up backups older than $RETENTION_DAYS days..."

find "$BACKUP_DIR" -name "postgres_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +$RETENTION_DAYS -delete

log "Cleanup complete."

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log "Backup completed successfully!"
log "PostgreSQL: $PG_BACKUP_FILE"
log "Retention: $RETENTION_DAYS days"

exit 0
