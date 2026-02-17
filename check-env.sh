#!/bin/bash
# Скрипт для проверки переменных окружения на сервере
# Запускать НА СЕРВЕРЕ в каталоге проекта: bash check-env.sh

PROJECT_DIR="${1:-/var/www/burker-watches.ru}"
cd "$PROJECT_DIR" || exit 1

echo "=== Проверка переменных окружения ==="
echo ""

# Проверяем .env файл
if [ -f .env ]; then
  echo "✓ Файл .env найден"
  echo ""
  echo "Содержимое .env (скрытые значения):"
  grep -E "^CDEK_CLIENT_ID=|^CDEK_CLIENT_SECRET=|^CRON_SECRET=|^DATABASE_URL=" .env | sed 's/=.*/=***/' || echo "  (переменные не найдены)"
else
  echo "✗ Файл .env НЕ найден!"
  echo "  Создайте файл .env с переменными окружения"
fi

echo ""
echo "--- Переменные окружения процесса PM2 ---"
pm2 env 0 2>/dev/null | grep -E "CDEK_CLIENT_ID|CDEK_CLIENT_SECRET|CRON_SECRET|DATABASE_URL" || echo "  (не найдены в PM2 env)"

echo ""
echo "--- Проверка через Node.js (как видит Next.js) ---"
node -e "
const fs = require('fs');
const path = require('path');

// Загружаем .env вручную (как делает Next.js)
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^[\"']|[\"']\$/g, '');
    }
  });
  
  console.log('CDEK_CLIENT_ID:', env.CDEK_CLIENT_ID ? env.CDEK_CLIENT_ID.substring(0, 10) + '... (' + env.CDEK_CLIENT_ID.length + ' символов)' : 'НЕ УСТАНОВЛЕН');
  console.log('CDEK_CLIENT_SECRET:', env.CDEK_CLIENT_SECRET ? env.CDEK_CLIENT_SECRET.substring(0, 10) + '... (' + env.CDEK_CLIENT_SECRET.length + ' символов)' : 'НЕ УСТАНОВЛЕН');
  console.log('CRON_SECRET:', env.CRON_SECRET ? env.CRON_SECRET.substring(0, 10) + '... (' + env.CRON_SECRET.length + ' символов)' : 'НЕ УСТАНОВЛЕН');
  console.log('DATABASE_URL:', env.DATABASE_URL || 'НЕ УСТАНОВЛЕН');
} else {
  console.log('Файл .env не найден');
}
"

echo ""
echo "=== Рекомендации ==="
echo "1. Если переменные не установлены, создайте файл .env:"
echo "   nano .env"
echo ""
echo "2. Добавьте в .env:"
echo "   CDEK_CLIENT_ID=\"ваш_client_id\""
echo "   CDEK_CLIENT_SECRET=\"ваш_client_secret\""
echo "   CRON_SECRET=\"ваш-секретный-ключ\""
echo ""
echo "3. После создания/изменения .env перезапустите PM2:"
echo "   pm2 restart burker-watches"
echo ""
echo "4. Проверьте логи после перезапуска:"
echo "   pm2 logs burker-watches --lines 50"
