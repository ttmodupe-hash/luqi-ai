#!/usr/bin/env bash
# Explicitly invoked logical exports; this does not configure a backup schedule.
# DB_ENGINE=mysql for Railway MySQL; postgres remains the legacy default.
set +x
set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/var/backups/luqi-ai}"
DB_ENGINE="${DB_ENGINE:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-luqi_ai}"
DB_USER="${DB_USER:-luqi}"
DB_PASSWORD="${DB_PASSWORD:-}"
BACKUP_REDIS="${BACKUP_REDIS:-true}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"

log() { printf '%s\n' "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

case "$DB_ENGINE" in
  mysql) DB_PORT="${DB_PORT:-3306}"; dump_tool=mysqldump ;;
  postgres) DB_PORT="${DB_PORT:-5432}"; dump_tool=pg_dump ;;
  *) fail "DB_ENGINE must be mysql or postgres." ;;
esac
[[ "$BACKUP_REDIS" == true || "$BACKUP_REDIS" == false ]] || fail "BACKUP_REDIS must be true or false."
[[ "$RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]] || fail "RETENTION_DAYS must be a positive integer."
[[ "$DB_NAME" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$ ]] || fail "DB_NAME contains unsupported characters."
[[ "$DB_PORT" =~ ^[0-9]+$ ]] || fail "DB_PORT must be numeric."
command -v "$dump_tool" >/dev/null || fail "Required database client is missing."
command -v gzip >/dev/null || fail "gzip is missing."
if [[ "$BACKUP_REDIS" == true ]]; then
  command -v redis-cli >/dev/null || fail "redis-cli is missing."
fi
if [[ -n "$S3_BUCKET" ]]; then
  [[ "$S3_BUCKET" == s3://* ]] || fail "S3_BUCKET must be an s3:// destination."
  command -v aws >/dev/null || fail "AWS CLI is missing."
fi

[[ ! -L "$BACKUP_DIR" ]] || fail "BACKUP_DIR must not be a symlink."
mkdir -p -m 700 "$BACKUP_DIR"
[[ "$(stat -c %u "$BACKUP_DIR")" == "$EUID" ]] || fail "BACKUP_DIR must be owned by the invoking user."
mode="$(stat -c %a "$BACKUP_DIR")"
(( (8#$mode & 077) == 0 )) || fail "BACKUP_DIR must not be accessible by group or other users."

temporary_dir="$(mktemp -d "$BACKUP_DIR/.incomplete.XXXXXXXX")"
trap 'rm -rf -- "$temporary_dir"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
stamp="$(date -u +%Y%m%dT%H%M%SZ)_${temporary_dir##*.}"
database_file="$temporary_dir/${DB_ENGINE}_${DB_NAME}_${stamp}.sql.gz"

# Passwords never appear in command arguments or logs. Raw client stderr stays
# in the private temporary directory and is removed even when the export fails.
log "Exporting $DB_ENGINE database..."
if [[ "$DB_ENGINE" == mysql ]]; then
  if ! MYSQL_PWD="$DB_PASSWORD" mysqldump --host="$DB_HOST" --port="$DB_PORT" \
      --user="$DB_USER" --single-transaction --quick --routines --triggers \
      --no-tablespaces --set-gtid-purged=OFF -- "$DB_NAME" \
      2> "$temporary_dir/client-error" | gzip > "$database_file"; then
    fail "MySQL export failed; no backup published."
  fi
else
  if ! PGPASSWORD="$DB_PASSWORD" pg_dump --host="$DB_HOST" --port="$DB_PORT" \
      --username="$DB_USER" --dbname="$DB_NAME" --no-owner --no-privileges \
      2> "$temporary_dir/client-error" | gzip > "$database_file"; then
    fail "PostgreSQL export failed; no backup published."
  fi
fi
gzip -t "$database_file" || fail "Compressed export is corrupt."
# A successful client returning no SQL must not count as a backup.
[[ "$(gzip -cd "$database_file" | wc -c)" -gt 0 ]] || fail "Database export is empty."
files=("$database_file")
if [[ "$BACKUP_REDIS" == true ]]; then
  redis_file="$temporary_dir/redis_${stamp}.rdb"
  log "Downloading Redis snapshot..."
  if ! REDISCLI_AUTH="${REDIS_PASSWORD:-}" redis-cli \
      --host "${REDIS_HOST:-localhost}" --port "${REDIS_PORT:-6379}" \
      --rdb "$redis_file" > "$temporary_dir/redis-output" 2>&1; then
    fail "Redis export failed; no backup published."
  fi
  [[ -s "$redis_file" && "$(head -c 5 "$redis_file")" == REDIS ]] || fail "Redis snapshot is missing or invalid."
  files+=("$redis_file")
fi

# Upload only completed exports. An upload error prevents retention cleanup.
# This uses an already configured destination; it never provisions storage.
if [[ -n "$S3_BUCKET" ]]; then
  for file in "${files[@]}"; do
    aws s3 cp "$file" "${S3_BUCKET%/}/${file##*/}" --only-show-errors \
      > "$temporary_dir/upload-output" 2>&1 || fail "Remote upload failed; retention cleanup skipped."
  done
fi
for file in "${files[@]}"; do
  mv -- "$file" "$BACKUP_DIR/"
done
# Delete only this database engine/name's old exports, plus Redis if requested.
find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_ENGINE}_${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
if [[ "$BACKUP_REDIS" == true ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'redis_*.rdb' -mtime +"$RETENTION_DAYS" -delete
fi
log "Backup export completed: ${#files[@]} file(s). Restore verification is a separate step."
