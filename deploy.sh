#!/bin/bash

# Скрипт деплоя для сервера
# Использование: ./deploy.sh

set -e  # Остановить при ошибке

cd /var/www/burker-watches.ru
DB_PATH="${DB_PATH:-/var/lib/burker-watches/dev.db}"

echo "📦 Обновление кода из git..."
git pull origin main

echo "📦 Установка зависимостей..."
npm install

echo "🗄️  Генерация Prisma Client..."
npx prisma generate

echo "🗄️  Инициализация/обновление базы данных..."
mkdir -p "$(dirname "$DB_PATH")"
# Одноразовый bootstrap: если runtime-БД ещё нет, берём начальный снимок из repo-local prisma/dev.db.
if [ ! -f "$DB_PATH" ] && [ -f "prisma/dev.db" ]; then
  cp prisma/dev.db "$DB_PATH"
fi
export DATABASE_URL="file:$DB_PATH"
# Проверить размер базы данных
DB_SIZE=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null || echo "0")
if [ "$DB_SIZE" = "0" ] || [ ! -f "$DB_PATH" ]; then
  echo "   База данных пустая или не существует, создаём заново..."
  rm -f "$DB_PATH"
  npx prisma db push --accept-data-loss --skip-generate
else
  echo "   База данных существует, обновляем схему..."
  npx prisma db push --skip-generate
fi

echo "🏗️  Сборка проекта..."
npm run build

echo "🧹 Очистка dev зависимостей..."
npm prune --production

echo "🔄 Перезапуск PM2..."
pm2 stop burker-watches || true
pm2 delete burker-watches || true

# Удалить старые дампы PM2
rm -f /root/.pm2/dump.pm2
rm -f /root/.pm2/dump.pm2.bak

echo "🚀 Запуск приложения..."
pm2 start ecosystem.config.js

echo "💾 Сохранение конфигурации PM2..."
pm2 save

echo "📊 Статус приложения:"
pm2 status

echo "📋 Проверка переменных окружения:"
pm2 env 0 | grep DATABASE_URL || echo "DATABASE_URL не найден"

echo "✅ Деплой завершён!"
echo ""
echo "Проверьте логи: pm2 logs burker-watches --lines 50"
