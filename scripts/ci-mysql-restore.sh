#!/usr/bin/env bash
# Restore verification uses a disposable local CI MySQL server ONLY.
# Never pass a production DATABASE_URL or Railway MySQL password here.
set -euo pipefail

if [[ "${LUQI_MYSQL_CI_FIXTURE:-}" != "true" ||
      "${DATABASE_URL:-}" != "mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci" ]]; then
  echo "Refusing to dump/restore a non-CI database." >&2
  exit 1
fi

client_image="mysql:8.4"
mysql_cmd() {
  docker run --rm --interactive --network host -e MYSQL_PWD=ci-ephemeral-only-password \
    "$client_image" mysql --host=127.0.0.1 --port=3306 --user=root "$@"
}
umask 077
temporary_dir="$(mktemp -d)"
trap 'rm -rf "$temporary_dir"' EXIT

# Exercise the same export script an operator will invoke. Only the transport
# is wrapped: this isolated runner uses the MySQL 8.4 client in Docker.
mkdir "$temporary_dir/bin"
cat > "$temporary_dir/bin/mysqldump" <<'CLIENT'
#!/usr/bin/env bash
exec docker run --rm --network host -e MYSQL_PWD mysql:8.4 mysqldump "$@"
CLIENT
chmod 700 "$temporary_dir/bin/mysqldump"
echo "CI restore: exporting disposable MySQL source"
PATH="$temporary_dir/bin:$PATH" DB_ENGINE=mysql BACKUP_REDIS=false \
  BACKUP_DIR="$temporary_dir/backups" DB_HOST=127.0.0.1 DB_PORT=3306 \
  DB_USER=root DB_PASSWORD=ci-ephemeral-only-password DB_NAME=luqi_ci \
  S3_BUCKET= bash scripts/backup.sh
backups=("$temporary_dir/backups/"mysql_luqi_ci_*.sql.gz)
test "${#backups[@]}" = 1
gzip -cd "${backups[0]}" > "$temporary_dir/luqi-backup.sql"
test -s "$temporary_dir/luqi-backup.sql"

# IMPORTANT: never restore into the source or an existing database.
mysql_cmd --execute="CREATE DATABASE luqi_restore_ci"
mysql_cmd luqi_restore_ci < "$temporary_dir/luqi-backup.sql"
echo "CI restore: new database populated"

query() {
  mysql_cmd --skip-column-names --batch luqi_restore_ci --execute="$1"
}
original_query() {
  mysql_cmd --skip-column-names --batch luqi_ci --execute="$1"
}

tables="$(query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='luqi_restore_ci' AND table_type='BASE TABLE'")"
echo "CI restore: restored table count=$tables"
test "$tables" = "37"

source_accounts="$(original_query "SELECT COUNT(*) FROM users WHERE email='ci-restore@example.invalid'")"
restored_accounts="$(query "SELECT COUNT(*) FROM users WHERE email='ci-restore@example.invalid'")"
test "$source_accounts" = "1"
echo "CI restore: user record count $restored_accounts"
test "$restored_accounts" = "$source_accounts"

source_budget="$(original_query "SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc='2026-10' AND provider='gemini'")"
restored_budget="$(query "SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc='2026-10' AND provider='gemini'")"
test "$source_budget" = "150"
echo "CI restore: provider reservation cents=$restored_budget"
test "$restored_budget" = "$source_budget"

source_daily="$(original_query "SELECT attempts FROM ai_pilot_daily_user_usage WHERE day_utc='2026-10-22'")"
restored_daily="$(query "SELECT attempts FROM ai_pilot_daily_user_usage WHERE day_utc='2026-10-22'")"
test "$source_daily" = "7"
echo "CI restore: daily quota attempts=$restored_daily"
test "$restored_daily" = "$source_daily"

# Check that transaction-safe ledger semantics still exist in the restored copy.
engine="$(mysql_cmd --skip-column-names --batch --execute="SELECT ENGINE FROM information_schema.tables WHERE table_schema='luqi_restore_ci' AND table_name='ai_pilot_monthly_spend'")"
echo "CI restore: budget ledger engine=$engine"
test "$engine" = "InnoDB"
echo "PASS: restored 37 tables, account fixture and both atomic budget ledgers in isolated MySQL."
