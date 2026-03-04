#!/bin/bash

# Скрипт для принудительного обновления Prisma Client в standalone сборке
# Использование: ./scripts/fix-prisma-client.sh

set -e

cd /var/www/burker-watches.ru

echo "🔄 Принудительное обновление Prisma Client..."

# Остановить приложение
pm2 stop burker-watches || true

# Перегенерировать Prisma Client
echo "1. Перегенерирование Prisma Client..."
npx prisma generate

# Удалить старую сборку
echo "2. Удаление старой сборки..."
rm -rf .next

# Пересобрать приложение
echo "3. Пересборка приложения..."
npm run build

# Принудительно скопировать Prisma Client в standalone
echo "4. Принудительное копирование Prisma Client в standalone..."
rm -rf .next/standalone/node_modules/.prisma
rm -rf .next/standalone/node_modules/@prisma
mkdir -p .next/standalone/node_modules/.prisma
mkdir -p .next/standalone/node_modules/@prisma
cp -r node_modules/.prisma .next/standalone/node_modules/
cp -r node_modules/@prisma .next/standalone/node_modules/

# Проверить, что Prisma Client скопирован
if [ -f ".next/standalone/node_modules/.prisma/client/index.js" ]; then
  echo "✅ Prisma Client успешно скопирован"
else
  echo "❌ ОШИБКА: Prisma Client не скопирован!"
  exit 1
fi

# Перезапустить приложение
echo "5. Перезапуск приложения..."
pm2 restart burker-watches || pm2 start ecosystem.config.js

echo ""
echo "✅ Prisma Client обновлен!"
echo "Проверьте логи: pm2 logs burker-watches --lines 30"
