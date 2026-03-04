#!/bin/bash

# Скрипт для полного пересоздания базы данных с нуля
# ВНИМАНИЕ: Удалит все данные в базе данных!
# Использование: ./scripts/reset-database.sh

set -e

cd /var/www/burker-watches.ru

echo "⚠️  ВНИМАНИЕ: Этот скрипт удалит все данные в базе данных!"
echo "Создание резервной копии..."

# Создать резервную копию базы данных
BACKUP_DIR="/var/www/burker-watches.ru/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/dev.db.backup.$(date +%Y%m%d_%H%M%S)"

if [ -f "prisma/dev.db" ]; then
  cp prisma/dev.db "$BACKUP_FILE"
  echo "✅ Резервная копия создана: $BACKUP_FILE"
else
  echo "⚠️  База данных не найдена, резервная копия не создана"
fi

echo ""
echo "🗑️  Удаление старой базы данных и миграций..."

# Остановить приложение
pm2 stop burker-watches || true

# Удалить базу данных
rm -f prisma/dev.db
rm -f prisma/dev.db-journal
rm -f prisma/dev.db-wal
rm -f prisma/dev.db-shm

# Удалить все миграции (опционально, можно оставить для истории)
# rm -rf prisma/migrations

echo "✅ Старая база данных удалена"

echo ""
echo "🗄️  Создание новой базы данных из схемы Prisma..."

# Применить схему напрямую (без миграций)
npx prisma db push --accept-data-loss --skip-generate

echo "✅ База данных создана"

echo ""
echo "🔄 Перегенерирование Prisma Client..."
npx prisma generate

echo "✅ Prisma Client перегенерирован"

echo ""
echo "🏗️  Пересборка приложения..."
rm -rf .next
npm run build

echo ""
echo "📦 Проверка и копирование Prisma Client в standalone..."
# Убедиться, что Prisma Client скопирован в standalone
if [ ! -d ".next/standalone/node_modules/.prisma" ]; then
  echo "   Копирование Prisma Client..."
  mkdir -p .next/standalone/node_modules/.prisma
  cp -r node_modules/.prisma .next/standalone/node_modules/
fi

if [ ! -d ".next/standalone/node_modules/@prisma" ]; then
  echo "   Копирование @prisma..."
  mkdir -p .next/standalone/node_modules/@prisma
  cp -r node_modules/@prisma .next/standalone/node_modules/
fi

echo "✅ Приложение пересобрано"

echo ""
echo "🚀 Перезапуск приложения..."
pm2 restart burker-watches || pm2 start ecosystem.config.js

echo ""
echo "✅ База данных полностью пересоздана!"
echo "📋 Резервная копия сохранена в: $BACKUP_FILE"
echo ""
echo "Проверьте логи: pm2 logs burker-watches --lines 30"
