#!/usr/bin/env bash
# ==============================================================================
# Enterprise Chat - Automated PostgreSQL Backup Script
# Usage: ./scripts/backup.sh
# Schedule with cron: 0 2 * * * /path/to/enterprise-chat-app/scripts/backup.sh >> /var/log/chat-backup.log 2>&1
# ==============================================================================

set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${CONTAINER_NAME:-enterprise_chat_postgres}"
DB_USER="${POSTGRES_USER:-chat_admin}"
DB_NAME="${POSTGRES_DB:-enterprise_chat}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "=================================================="
echo "📦 [$(date '+%Y-%m-%d %H:%M:%S')] Starting database backup..."
echo "Container: $CONTAINER_NAME"
echo "Database:  $DB_NAME"
echo "Target:    $BACKUP_FILE"
echo "=================================================="

# Check if docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Container '$CONTAINER_NAME' is not running!" >&2
  exit 1
fi

# Execute pg_dump inside container and pipe to gzip
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ [$(date '+%Y-%m-%d %H:%M:%S')] Backup created successfully! Size: $FILE_SIZE"
else
  echo "❌ Error: Backup file is empty or was not created!" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Clean up older backups based on retention policy
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "backup_${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -v {} \;

echo "✨ Backup job finished successfully."
