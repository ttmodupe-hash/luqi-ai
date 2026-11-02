#!/usr/bin/env bash
# Fixture ONLY. This wrapper must never be pointed at a production database.
set +x
set -euo pipefail
umask 077
if [[ "${LUQI_MYSQL_CI_FIXTURE:-}" != true ||
      "${DATABASE_URL:-}" != 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci' ]]; then
  echo 'Refusing non-fixture source.' >&2
  exit 1
fi
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
mkdir "$work/bin"
cat > "$work/bin/mysqldump" <<'CLIENT'
#!/usr/bin/env bash
exec docker run --rm --network host -e MYSQL_PWD mysql:8.4 mysqldump "$@"
CLIENT
chmod 700 "$work/bin/mysqldump"
# The existing real export path runs only against the disposable CI service.
PATH="$work/bin:$PATH" DB_ENGINE=mysql BACKUP_REDIS=false \
  BACKUP_DIR="$work/backups" DB_HOST=127.0.0.1 DB_PORT=3306 \
  DB_USER=root DB_PASSWORD=ci-ephemeral-only-password DB_NAME=luqi_ci \
  S3_BUCKET= bash scripts/backup.sh
backups=("$work/backups/"mysql_luqi_ci_*.sql.gz)
test "${#backups[@]}" = 1
hash="$(sha256sum "${backups[0]}" | cut -d ' ' -f 1)"
python3 scripts/verify-local-mysql-backup.py --backup "${backups[0]}" \
  --sha256 "$hash" --source-kind fixture --execute --report "$work/evidence.json"
python3 - "$work/evidence.json" <<'VERIFY'
import json, sys
with open(sys.argv[1]) as source:
    evidence = json.load(source)
assert evidence['result'] == 'isolated_import_and_readback_passed'
assert evidence['source_kind_operator_declared'] == 'fixture'
assert evidence['temporary_container_removed'] is True
assert evidence['enabled_runtime_tables'] == 8
assert evidence['launch_approved'] is False
assert evidence['source_data_equivalence_verified'] is False
print('PASS: real fixture export imported, read back and removed in a new network-isolated container.')
print('This verifies tooling only, not a production backup, schedule or recovery objective.')
VERIFY
# No SQL or backup/report artifact is uploaded by this job.
