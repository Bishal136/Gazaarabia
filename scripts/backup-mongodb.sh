#!/usr/bin/env bash
# ==============================================================================
# Gazaarabia Automated MongoDB Backup & Disaster Recovery Script
# Retains daily snapshots for 7 days with timestamped archives.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/mongodb}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gaza_db_${TIMESTAMP}.gz"
RETENTION_DAYS=7

echo "--- [$(date -Iseconds)] Starting Gazaarabia Database Backup ---"
mkdir -p "$BACKUP_DIR"

# Detect if MongoDB is running inside Docker or natively on host
if docker ps --format '{{.Names}}' | grep -q "^gaza-mongo$"; then
  echo "Executing mongodump inside Docker container 'gaza-mongo'..."
  docker exec gaza-mongo mongodump --uri="mongodb://127.0.0.1:27017/gaza_db" --archive | gzip > "$BACKUP_FILE"
elif command -v mongodump &> /dev/null; then
  echo "Executing host mongodump..."
  mongodump --uri="mongodb://127.0.0.1:27017/gaza_db" --archive | gzip > "$BACKUP_FILE"
else
  echo "Error: Neither Docker container 'gaza-mongo' nor host 'mongodump' command was found." >&2
  exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup successfully written: $BACKUP_FILE ($FILE_SIZE)"

# Clean up backups older than retention window
echo "Purging backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "gaza_db_*.gz" -mtime +"$RETENTION_DAYS" -delete || true

echo "--- [$(date -Iseconds)] Database Backup Completed Successfully ---"
