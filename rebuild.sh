#!/bin/bash

# Скрипт полной пересборки проекта с нуля
# Использование: ./rebuild.sh

set -e  # Остановить при ошибке

cd /var/www/burker-watches.ru

echo "🧹 Очистка старых файлов сборки..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "📦 Обновление кода из git..."
git pull origin main

echo "📦 Удаление node_modules для чистой установки..."
rm -rf node_modules

echo "📦 Установка зависимостей..."
npm install

echo "🗄️  Генерация Prisma Client..."
npx prisma generate

echo "🗄️  Пересоздание базы данных..."
# Удалить старую базу данных
rm -f prisma/dev.db
# Создать новую с таблицами
npx prisma db push --accept-data-loss --skip-generate

echo "✅ Проверка таблиц в базе данных..."
sqlite3 prisma/dev.db ".tables" || echo "⚠️  Таблицы не найдены"

echo "🏗️  Полная пересборка проекта..."
npm run build

echo "🧹 Очистка dev зависимостей..."
npm prune --production

echo "🔄 Остановка PM2..."
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
pm2 env 0 | grep -E "DATABASE_URL|NODE_ENV|PORT" || echo "Переменные не найдены"

echo "✅ Пересборка завершена!"
echo ""
echo "Проверьте логи: pm2 logs burker-watches --lines 50"
echo "Проверьте сайт: curl http://localhost:3010/admin -I"
