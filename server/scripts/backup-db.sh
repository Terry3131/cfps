#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/cfps}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/cfps/uploads}"
DATE="$(date -u +%Y%m%dT%H%M%SZ)"
DB_BACKUP="${BACKUP_DIR}/cfps_db_${DATE}.backup"
UPLOAD_BACKUP="${BACKUP_DIR}/cfps_uploads_${DATE}.tar.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

pg_dump "$DATABASE_URL" -F c -f "$DB_BACKUP"
chmod 600 "$DB_BACKUP"

if [[ -d "$UPLOAD_DIR" ]]; then
  tar -czf "$UPLOAD_BACKUP" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
  chmod 600 "$UPLOAD_BACKUP"
  echo "Uploads backup: $UPLOAD_BACKUP"
else
  echo "Uploads directory not found, skipped: $UPLOAD_DIR" >&2
fi

echo "Database backup: $DB_BACKUP"
