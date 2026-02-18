# Инструкция по сборке и деплою проекта MiraShop | Burker

## Содержание
1. [Локальная сборка и запуск](#локальная-сборка-и-запуск)
2. [Деплой на сервер (через PM2)](#деплой-на-сервер-через-pm2)
3. [Деплой через Docker](#деплой-через-docker)
4. [Настройка переменных окружения](#настройка-переменных-окружения)
5. [Проверка работоспособности](#проверка-работоспособности)

---

## Локальная сборка и запуск

### Требования
- Node.js 18.x или выше
- npm или yarn
- Git

### Шаги

1. **Клонирование репозитория**
```bash
git clone https://github.com/siraevrus/burker_site.git
cd burker_site
```

2. **Установка зависимостей**
```bash
npm install
```

3. **Настройка базы данных**
```bash
# Генерация Prisma Client
npx prisma generate

# Применение схемы к базе данных
npx prisma db push
```

4. **Настройка переменных окружения**
Создайте файл `.env` в корне проекта:
```env
DATABASE_URL="file:./prisma/dev.db"
CDEK_CLIENT_ID="ваш_client_id"
CDEK_CLIENT_SECRET="ваш_client_secret"
CRON_SECRET="ваш-секретный-ключ"
```

5. **Запуск в режиме разработки**
```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3000

6. **Сборка для production**
```bash
npm run build
```

7. **Запуск production версии**
```bash
npm start
```

---

## Деплой на сервер (через PM2)

### Требования к серверу
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Node.js 18.x или выше
- PM2 (процесс-менеджер)
- Nginx (опционально, для реверс-прокси)

### Первоначальная настройка

1. **Подключение к серверу**
```bash
ssh root@ваш-сервер-ip
```

2. **Установка Node.js (если не установлен)**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Установка PM2**
```bash
npm install -g pm2
```

4. **Клонирование проекта**
```bash
cd /var/www
git clone https://github.com/siraevrus/burker_site.git burker-watches.ru
cd burker-watches.ru
```

5. **Настройка переменных окружения**
```bash
nano .env
```

Добавьте:
```env
DATABASE_URL="file:./prisma/dev.db"
CDEK_CLIENT_ID="ваш_client_id"
CDEK_CLIENT_SECRET="ваш_client_secret"
CRON_SECRET="ваш-секретный-ключ"
```

6. **Первая сборка**
```bash
npm install
npx prisma generate
npm run build
npm prune --production
```

7. **Запуск через PM2**
```bash
pm2 start npm --name "burker-watches" -- start
pm2 save
pm2 startup
```

### Обновление проекта (деплой)

**Вариант 1: Использование скрипта deploy.sh**
```bash
cd /var/www/burker-watches.ru
./deploy.sh
```

**Вариант 2: Ручное обновление**
```bash
cd /var/www/burker-watches.ru
git pull origin main
npm install
npx prisma generate
npm run build
npm prune --production
pm2 restart burker-watches
```

### Полезные команды PM2
```bash
pm2 list                    # Список процессов
pm2 logs burker-watches     # Просмотр логов
pm2 restart burker-watches  # Перезапуск
pm2 stop burker-watches    # Остановка
pm2 delete burker-watches   # Удаление
pm2 monit                   # Мониторинг ресурсов
```

---

## Деплой через Docker

### Требования
- Docker
- Docker Compose

### Шаги

1. **Клонирование проекта**
```bash
git clone https://github.com/siraevrus/burker_site.git
cd burker_site
```

2. **Настройка переменных окружения**
Создайте файл `.env` в корне проекта:
```env
CRON_SECRET="ваш-секретный-ключ"
CDEK_CLIENT_ID="ваш_client_id"
CDEK_CLIENT_SECRET="ваш_client_secret"
```

3. **Сборка и запуск контейнеров**
```bash
docker-compose build
docker-compose up -d
```

4. **Проверка статуса**
```bash
docker-compose ps
docker-compose logs app
```

5. **Обновление проекта**
```bash
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

6. **Остановка контейнеров**
```bash
docker-compose down
```

### Структура Docker Compose

- **app** - основное приложение Next.js (порт 3000)
- **cron** - сервис для обновления курсов валют каждые 4 часа

---

## Настройка переменных окружения

### Обязательные переменные

Создайте файл `.env` в корне проекта:

```env
# База данных
DATABASE_URL="file:./prisma/dev.db"

# CDEK API (для доставки)
CDEK_CLIENT_ID="ваш_client_id_из_личного_кабинета_сдэк"
CDEK_CLIENT_SECRET="ваш_client_secret_из_личного_кабинета_сдэк"

# Секретный ключ для cron-эндпоинта обновления курсов валют
CRON_SECRET="ваш-секретный-ключ-для-безопасности"

# Email (Mailopost API)
MAILOPOST_API_URL="https://api.mailopost.ru/v1"
MAILOPOST_API_TOKEN="ваш_api_token"
MAILOPOST_FROM_EMAIL="noreply@burker-watches.ru"
MAILOPOST_FROM_NAME="MiraShop | Burker"
ADMIN_EMAIL="info@kondratov.online"
```

### Где взять данные CDEK

1. Зайдите в [личный кабинет СДЭК](https://api.cdek.ru/)
2. Перейдите в раздел "API" или "Настройки API"
3. Найдите:
   - **Account** → это `CDEK_CLIENT_ID`
   - **Secure password** → это `CDEK_CLIENT_SECRET`

### Проверка переменных окружения

На сервере можно использовать скрипт:
```bash
cd /var/www/burker-watches.ru
bash check-env.sh
```

---

## Проверка работоспособности

### После деплоя проверьте:

1. **Статус приложения**
```bash
# PM2
pm2 status

# Docker
docker-compose ps
```

2. **Логи приложения**
```bash
# PM2
pm2 logs burker-watches --lines 50

# Docker
docker-compose logs app --tail=50
```

3. **Доступность сайта**
```bash
curl http://localhost:3000
```

4. **Проверка API**
```bash
# Проверка курсов валют
curl http://localhost:3000/api/cron/update-rates -H "X-Cron-Secret: ваш-секретный-ключ"

# Проверка ПВЗ СДЭК
curl "http://localhost:3000/api/cdek/deliverypoints?city=москва"
```

5. **Проверка базы данных**
```bash
npx prisma studio
# Откроется веб-интерфейс на http://localhost:5555
```

---

## Настройка Nginx (реверс-прокси)

### Установка Nginx
```bash
sudo apt update
sudo apt install nginx
```

### Конфигурация

Создайте файл `/etc/nginx/sites-available/burker-watches.ru`:

```nginx
server {
    listen 80;
    server_name burker-watches.ru www.burker-watches.ru;

    # Редирект на HTTPS (после настройки SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Кеширование статических файлов
    location /_next/static {
        proxy_pass http://localhost:3010;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Максимальный размер загружаемых файлов
    client_max_body_size 10M;
}
```

### Активация
```bash
sudo ln -s /etc/nginx/sites-available/burker-watches.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Настройка SSL (Let's Encrypt)

### Установка Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### Получение SSL сертификата
```bash
sudo certbot --nginx -d burker-watches.ru -d www.burker-watches.ru
```

Certbot автоматически настроит HTTPS и обновление сертификатов.

---

## Резервное копирование

### База данных
```bash
# Копирование SQLite базы данных
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d)
```

### Загруженные файлы
```bash
# Копирование промо-изображений
tar -czf promo-backup-$(date +%Y%m%d).tar.gz public/promo/
```

---

## Troubleshooting

### Проблема: Приложение не запускается

1. Проверьте логи:
```bash
pm2 logs burker-watches
# или
docker-compose logs app
```

2. Проверьте переменные окружения:
```bash
bash check-env.sh
```

3. Проверьте порт:
```bash
sudo netstat -tlnp | grep :3010
```

### Проблема: Ошибка сборки

1. Очистите кэш:
```bash
rm -rf .next node_modules
npm install
npm run build
```

2. Проверьте версию Node.js:
```bash
node --version  # Должна быть 18.x или выше
```

### Проблема: База данных не работает

1. Проверьте путь к базе данных:
```bash
ls -la prisma/dev.db
```

2. Примените схему заново:
```bash
npx prisma db push
```

### Проблема: API СДЭК не работает

1. Проверьте переменные окружения:
```bash
cat .env | grep CDEK
```

2. Проверьте логи:
```bash
pm2 logs burker-watches | grep CDEK
```

3. Используйте скрипт диагностики:
```bash
bash test-cdek-api.sh
```

---

## Быстрая справка

### Команды для деплоя на сервер
```bash
cd /var/www/burker-watches.ru
./deploy.sh
```

### Команды для Docker
```bash
docker-compose build && docker-compose up -d
```

### Команды для проверки
```bash
pm2 status
pm2 logs burker-watches --lines 50
curl http://localhost:3000
```

---

## Дополнительные ресурсы

- [Документация Next.js](https://nextjs.org/docs)
- [Документация Prisma](https://www.prisma.io/docs)
- [Документация PM2](https://pm2.keymetrics.io/docs/)
- [Документация Docker](https://docs.docker.com/)
