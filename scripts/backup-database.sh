#!/bin/bash

# Скрипт бэкапа SQLite базы данных
# Использование: ./scripts/backup-database.sh
# Рекомендуется запускать через cron каждые 30 минут: */30 * * * *
#
# Сохраняет бэкапы в BACKUP_DIR, удаляет бэкапы старше 7 дней.
# Переменные окружения: DB_PATH, BACKUP_DIR (опционально)

set -e

# Рабочая директория (для запуска с cron из любой папки)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DB_PATH="${DB_PATH:-/var/lib/burker-watches/dev.db}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] База данных не найдена: $DB_PATH" >&2
  exit 1
fi

# Создать бэкап с временной меткой
BACKUP_FILE="$BACKUP_DIR/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DB_PATH" "$BACKUP_FILE"

# Удалить бэкапы старше RETENTION_DAYS (1 неделя)
# -mtime +N = файлы не изменялись более N суток
find "$BACKUP_DIR" -maxdepth 1 -name "dev.db.backup.*" -mtime +$((RETENTION_DAYS - 1)) -delete 2>/dev/null || true

# Опционально: логировать в файл при запуске из cron (BACKUP_LOG=/path/to/log)
if [ -n "${BACKUP_LOG:-}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: $BACKUP_FILE" >> "$BACKUP_LOG"
fi
