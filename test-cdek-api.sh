#!/bin/bash
# Скрипт для тестирования API СДЭК и проверки логов
# Запускать НА СЕРВЕРЕ: bash test-cdek-api.sh

PROJECT_DIR="${1:-/var/www/burker-watches.ru}"
cd "$PROJECT_DIR" || exit 1

echo "=== Тестирование API СДЭК ==="
echo ""

# Проверяем переменные окружения
echo "1. Проверка переменных окружения:"
if [ -f .env ]; then
  echo "✓ Файл .env найден"
  CDEK_CLIENT_ID=$(grep "^CDEK_CLIENT_ID=" .env | cut -d '=' -f2 | tr -d '"')
  CDEK_CLIENT_SECRET=$(grep "^CDEK_CLIENT_SECRET=" .env | cut -d '=' -f2 | tr -d '"')
  
  if [ -z "$CDEK_CLIENT_ID" ] || [ "$CDEK_CLIENT_ID" = "" ]; then
    echo "✗ CDEK_CLIENT_ID не установлен в .env"
  else
    echo "✓ CDEK_CLIENT_ID установлен (длина: ${#CDEK_CLIENT_ID} символов)"
  fi
  
  if [ -z "$CDEK_CLIENT_SECRET" ] || [ "$CDEK_CLIENT_SECRET" = "" ]; then
    echo "✗ CDEK_CLIENT_SECRET не установлен в .env"
  else
    echo "✓ CDEK_CLIENT_SECRET установлен (длина: ${#CDEK_CLIENT_SECRET} символов)"
  fi
else
  echo "✗ Файл .env НЕ найден!"
fi

echo ""
echo "2. Проверка переменных в PM2:"
pm2 env 0 2>/dev/null | grep -E "CDEK_CLIENT_ID|CDEK_CLIENT_SECRET" || echo "  (не найдены в PM2 env)"

echo ""
echo "3. Последние логи PM2 (последние 50 строк с [CDEK]):"
pm2 logs burker-watches --lines 200 --nostream 2>/dev/null | grep -i "\[CDEK\]" | tail -20 || echo "  (нет записей с [CDEK])"

echo ""
echo "4. Тестирование API напрямую через curl:"
echo "Запрос: GET /api/cdek/deliverypoints?city=воронеж"
echo ""

# Делаем запрос к локальному API
RESPONSE=$(curl -s "http://localhost:3000/api/cdek/deliverypoints?city=воронеж" 2>&1)
echo "Ответ сервера:"
echo "$RESPONSE" | head -20

echo ""
echo "5. Проверка логов после запроса (подождите 2 секунды...)"
sleep 2
pm2 logs burker-watches --lines 50 --nostream 2>/dev/null | tail -30

echo ""
echo "=== Рекомендации ==="
echo "Если переменные не установлены:"
echo "1. Создайте/отредактируйте файл .env"
echo "2. Добавьте CDEK_CLIENT_ID и CDEK_CLIENT_SECRET"
echo "3. Выполните: pm2 restart burker-watches"
echo ""
echo "Если переменные установлены, но API не работает:"
echo "1. Проверьте правильность учётных данных в личном кабинете СДЭК"
echo "2. Проверьте логи выше на наличие ошибок OAuth или API"
