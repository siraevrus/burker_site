#!/bin/bash

# Скрипт деплоя для сервера
# Использование: ./deploy.sh

set -e  # Остановить при ошибке

cd /var/www/burker-watches.ru

echo "📦 Обновление кода из git..."
git pull origin main

echo "📦 Установка зависимостей..."
npm install

echo "🗄️  Генерация Prisma Client..."
npx prisma generate

echo "🗄️  Инициализация/обновление базы данных..."
npx prisma db push --skip-generate

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
