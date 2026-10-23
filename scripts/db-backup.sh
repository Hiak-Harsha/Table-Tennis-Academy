#!/usr/bin/env bash
# ==============================================================================
# TTA Table Tennis Academy — Automated PostgreSQL Backup Script
# ==============================================================================
# Usage:
#   chmod +x scripts/db-backup.sh
#   ./scripts/db-backup.sh
#
# Recommended Cron Schedule (daily at 02:00 AM IST):
#   0 20 * * * /path/to/table-tennis-app/scripts/db-backup.sh >> /var/log/tta-backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/tta_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

echo "🏓 [TTA BACKUP] Starting database snapshot at $(date -u +"%Y-%m-%dT%H:%M:%SZ")..."

# Ensure backup destination directory exists
mkdir -p "${BACKUP_DIR}"

# Check for DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    echo "ℹ️ Loading environment from .env..."
    export $(grep -v '^#' .env | xargs)
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL is not set." >&2
  exit 1
fi

# Execute pg_dump with compression
echo "📦 Executing pg_dump into ${BACKUP_FILE}..."
pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip -9 > "${BACKUP_FILE}"

# Verify gzip archive integrity
echo "🔍 Verifying backup integrity..."
gzip -t "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup successfully created: ${BACKUP_FILE} (${FILESIZE})"

# Prune archives older than RETENTION_DAYS
echo "🧹 Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "tta_db_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm {} \;

# Cloud storage sync placeholder (Uncomment for AWS S3 or Cloudflare R2):
# if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
#   echo "☁️ Syncing to S3 bucket ${S3_BACKUP_BUCKET}..."
#   aws s3 cp "${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/db-backups/"
# fi

echo "🏓 [TTA BACKUP] Completed successfully at $(date -u +"%Y-%m-%dT%H:%M:%SZ")."
