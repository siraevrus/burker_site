#!/bin/bash

# ЯДЕРНЫЙ СКРИПТ ПОЛНОЙ ПЕРЕСБОРКИ
# Полностью удаляет все зависимости, кэши и сборки, затем пересобирает всё с нуля
# Использование: ./scripts/nuclear-rebuild.sh

set -e

cd /var/www/burker-watches.ru

echo "🚨 ЯДЕРНАЯ ПЕРЕСБОРКА - ВНИМАНИЕ!"
echo "Этот скрипт удалит ВСЁ и пересоберёт с нуля"
echo ""

# Остановить приложение
echo "1. Остановка приложения..."
pm2 stop burker-watches || true

# Удалить ВСЁ
echo "2. Удаление всех кэшей и сборок..."
rm -rf .next
rm -rf node_modules
rm -rf .prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# Очистить npm кэш
echo "3. Очистка npm кэша..."
npm cache clean --force || true

# Переустановить зависимости
echo "4. Переустановка зависимостей..."
npm install

# Синхронизировать схему с базой данных
echo "5. Синхронизация Prisma схемы с базой данных..."
npx prisma db push --skip-generate || npx prisma db push

# Перегенерировать Prisma Client
echo "6. Перегенерирование Prisma Client..."
npx prisma generate

# Проверить, что Prisma Client сгенерирован
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "❌ ОШИБКА: Prisma Client не сгенерирован!"
  exit 1
fi

echo "✅ Prisma Client сгенерирован успешно"

# Пересобрать приложение
echo "7. Пересборка приложения..."
npm run build

# Проверить, что standalone сборка создана
if [ ! -d ".next/standalone" ]; then
  echo "❌ ОШИБКА: Standalone сборка не создана!"
  exit 1
fi

# Принудительно скопировать Prisma Client в standalone
echo "8. Копирование Prisma Client в standalone..."
rm -rf .next/standalone/node_modules/.prisma
rm -rf .next/standalone/node_modules/@prisma
mkdir -p .next/standalone/node_modules/.prisma
mkdir -p .next/standalone/node_modules/@prisma
cp -r node_modules/.prisma .next/standalone/node_modules/
cp -r node_modules/@prisma .next/standalone/node_modules/

# Проверить, что Prisma Client скопирован
if [ ! -f ".next/standalone/node_modules/.prisma/client/index.js" ]; then
  echo "❌ ОШИБКА: Prisma Client не скопирован в standalone!"
  exit 1
fi

echo "✅ Prisma Client скопирован в standalone"

# Проверить схему Prisma Client
echo "9. Проверка схемы Prisma Client..."
if grep -q "order" ".next/standalone/node_modules/.prisma/client/index.d.ts" 2>/dev/null || \
   grep -q "order" ".next/standalone/node_modules/.prisma/client/index.js" 2>/dev/null; then
  echo "✅ Поле 'order' найдено в Prisma Client"
else
  echo "⚠️  ВНИМАНИЕ: Поле 'order' не найдено в Prisma Client!"
  echo "Проверьте schema.prisma"
fi

# Перезапустить приложение
echo "10. Перезапуск приложения..."
pm2 restart burker-watches || pm2 start ecosystem.config.js

echo ""
echo "✅ ЯДЕРНАЯ ПЕРЕСБОРКА ЗАВЕРШЕНА!"
echo ""
echo "Проверьте логи: pm2 logs burker-watches --lines 50"
echo ""
echo "Если ошибка сохраняется, проверьте:"
echo "1. Что поле 'order' есть в prisma/schema.prisma"
echo "2. Что база данных содержит колонку 'order' в таблице Page"
echo "3. Логи приложения: pm2 logs burker-watches"
