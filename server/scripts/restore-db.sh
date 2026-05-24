#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
UPLOAD_ARCHIVE="${2:-}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/cfps/uploads}"
PM2_PROCESS="${PM2_PROCESS:-cfps-backend}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: ./restore-db.sh /path/to/db.backup [/path/to/uploads.tar.gz]" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

if [[ "${CFPS_RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "Restore is destructive. Re-run with CFPS_RESTORE_CONFIRM=YES after confirming the target database." >&2
  exit 1
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 stop "$PM2_PROCESS" || true
fi

pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" "$BACKUP_FILE"

if [[ -n "$UPLOAD_ARCHIVE" ]]; then
  if [[ ! -f "$UPLOAD_ARCHIVE" ]]; then
    echo "Upload archive not found: $UPLOAD_ARCHIVE" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$UPLOAD_DIR")"
  tar -xzf "$UPLOAD_ARCHIVE" -C "$(dirname "$UPLOAD_DIR")"
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 start "$PM2_PROCESS" || true
fi

echo "Restore complete."
