# Инструкция по сборке и деплою проекта Mira Brands | Burker

## Содержание
1. [Git-стратегия и два стенда](#git-стратегия-и-два-стенда)
2. [Test-стенд: первичная настройка](#test-стенд-первичная-настройка)
3. [Деплой на Test-стенд](#деплой-на-test-стенд)
4. [Локальная сборка и запуск](#локальная-сборка-и-запуск)
5. [Деплой на сервер (через PM2)](#деплой-на-сервер-через-pm2)
6. [Деплой через Docker](#деплой-через-docker)
7. [Настройка переменных окружения](#настройка-переменных-окружения)
8. [Проверка работоспособности](#проверка-работоспособности)

---

## Git-стратегия и два стенда

### Принцип работы

```
feature/xxx  →  merge в main  →  deploy-test.sh  →  проверка  →  deploy-prod.sh
```

| Ветка | Роль |
|-------|------|
| `main` | Единственная ветка. Всегда содержит production-ready код. |
| `feature/название` | Рабочая ветка для новой функции. Создаётся от `main`. |
| `fix/название` | Рабочая ветка для исправления. Создаётся от `main`. |

### Рабочий процесс

```bash
# 1. Начало работы над фичей
git checkout main && git pull origin main
git checkout -b feature/my-feature

# 2. Разработка и коммиты
git add .
git commit -m "feat: описание изменения"

# 3. Отправка и Pull Request на GitHub
git push origin feature/my-feature
# → Создать PR на GitHub: feature/my-feature → main

# 4. После merge PR — деплой на тест
ssh root@сервер "cd /var/www/test.burker-watches.ru && ./deploy-test.sh"

# 5. Проверить на https://test.burker-watches.ru
# 6. Если всё ок — деплой на прод
ssh root@сервер "cd /var/www/burker-watches.ru && ./deploy-prod.sh"
```

### Стенды

| Параметр | Production | Test |
|----------|-----------|------|
| Домен | `burker-watches.ru` | `test.burker-watches.ru` |
| Порт | 3010 | 3011 |
| PM2-процесс | `burker-watches` | `burker-watches-test` |
| Директория | `/var/www/burker-watches.ru` | `/var/www/test.burker-watches.ru` |
| База данных | `/var/lib/burker-watches/dev.db` | `/var/lib/burker-watches-test/dev.db` |
| Конфиг PM2 | `ecosystem.config.js` | `ecosystem.config.test.js` |
| T-Bank | prod-терминал | test-терминал (`rest-api-test.tinkoff.ru`) |
| Доступ | Открытый | HTTP Basic Auth |

### Важно: секреты не в git

`ecosystem.config.js` и `ecosystem.config.test.js` добавлены в `.gitignore`.
В репозитории хранятся только шаблоны:
- `ecosystem.config.example.js` — для прода
- `ecosystem.config.test.example.js` — для теста

На сервере файлы с реальными секретами создаются вручную (см. ниже).

---

## Test-стенд: первичная настройка

Выполняется один раз при создании тест-стенда.

### 1. Создать директории на сервере

```bash
mkdir -p /var/www/test.burker-watches.ru
mkdir -p /var/lib/burker-watches-test
```

### 2. Клонировать репозиторий

```bash
cd /var/www/test.burker-watches.ru
git clone https://github.com/siraevrus/burker_site.git .
```

### 3. Создать ecosystem.config.test.js

```bash
cp ecosystem.config.test.example.js ecosystem.config.test.js
nano ecosystem.config.test.js  # заполнить реальными test-значениями
```

Ключевые отличия от прода:
- `PORT: 3011`
- `DATABASE_URL: "file:/var/lib/burker-watches-test/dev.db"`
- `NEXT_PUBLIC_SITE_URL: "https://test.burker-watches.ru"`
- `TBANK_TERMINAL` и `TBANK_PASSWORD` — тестовый терминал T-Bank
- `TELEGRAM_CHAT_ID` — отдельный чат для тестовых уведомлений

### 4. Настроить nginx

```bash
cp nginx-test.burker-watches.ru.conf.example /etc/nginx/sites-available/test.burker-watches.ru
# Отредактировать при необходимости
sudo ln -s /etc/nginx/sites-available/test.burker-watches.ru /etc/nginx/sites-enabled/

# Создать файл паролей для Basic Auth
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd_test ваш_логин

sudo nginx -t && sudo systemctl reload nginx
```

### 5. Получить SSL-сертификат для поддомена

```bash
sudo certbot certonly --nginx -d test.burker-watches.ru
sudo systemctl reload nginx
```

### 6. Первый деплой с засевом тестовых данных

```bash
cd /var/www/test.burker-watches.ru
SEED=1 ./deploy-test.sh
```

Флаг `SEED=1` запустит `npm run db:seed:test` — создаст демо-товары, промо-коды (`TEST10`, `TEST20`, `FIXED500`) и тестовый заказ.

---

## Деплой на Test-стенд

```bash
ssh root@сервер
cd /var/www/test.burker-watches.ru
./deploy-test.sh
```

### Дополнительные флаги

```bash
# Принудительно db push (если нет файлов миграций)
FORCE_DB_PUSH=1 ./deploy-test.sh

# Пересоздать тестовые данные
SEED=1 ./deploy-test.sh

# Сбросить только данные без деплоя (на сервере, в директории теста)
DATABASE_URL="file:/var/lib/burker-watches-test/dev.db" npm run db:seed:test
```

### Проверка

После деплоя:
- Сайт: `https://test.burker-watches.ru` (потребует логин/пароль из htpasswd)
- Health: `curl http://127.0.0.1:3011/api/health`
- Логи: `pm2 logs burker-watches-test`

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

# Применение миграций к базе данных
npx prisma migrate deploy
```

4. **Настройка переменных окружения**
Создайте файл `.env` в корне проекта:
```env
# Локальная разработка
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
DATABASE_URL="file:/var/lib/burker-watches/dev.db"
CDEK_CLIENT_ID="ваш_client_id"
CDEK_CLIENT_SECRET="ваш_client_secret"
CRON_SECRET="ваш-секретный-ключ"
```

6. **Первая сборка**
```bash
npm install
npx prisma generate
npx prisma migrate deploy
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

**Вариант 1: Использование скрипта deploy-prod.sh (рекомендуется)**
```bash
cd /var/www/burker-watches.ru
./deploy-prod.sh
```

Скрипт проверяет «грязное» дерево Git: деплой **не** блокируется, если изменения только в:
- `public/promo/*`, `public/products/*`, `public/order-proofs/*`, `uploads/*`, `uploads/promo/*` (загружаемые файлы, промо-баннеры из /api/promo-images),
- `public/yandex_*.html` (файлы верификации Яндекса на сервере),
- `ecosystem.config.js` (локальные настройки PM2/env на сервере).

**Вариант 2: Использование скрипта deploy.sh**
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
npx prisma migrate deploy
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
- **cron** - сервис для обновления курсов валют раз в сутки (05:00 UTC). Источник: API ЦБ РФ. Подробнее см. [CRON_SETUP.md](CRON_SETUP.md).

---

## Настройка переменных окружения

### Обязательные переменные

Создайте файл `.env` в корне проекта:

```env
# База данных
DATABASE_URL="file:/var/lib/burker-watches/dev.db"

# CDEK API (для доставки)
CDEK_CLIENT_ID="ваш_client_id_из_личного_кабинета_сдэк"
CDEK_CLIENT_SECRET="ваш_client_secret_из_личного_кабинета_сдэк"

# Секретный ключ для cron-эндпоинта обновления курсов валют
CRON_SECRET="ваш-секретный-ключ-для-безопасности"

# Email (Mailopost API)
MAILOPOST_API_URL="https://api.mailopost.ru/v1"
MAILOPOST_API_TOKEN="ваш_api_token"
MAILOPOST_FROM_EMAIL="noreply@burker-watches.ru"
MAILOPOST_FROM_NAME="Mira Brands | Burker"
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
# Проверка обновления курсов валют (ЦБ РФ, раз в сутки в 05:00)
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
cp /var/lib/burker-watches/dev.db /var/lib/burker-watches/dev.db.backup.$(date +%Y%m%d)
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
ls -la /var/lib/burker-watches/dev.db
```

2. Примените миграции заново:
```bash
npx prisma migrate deploy
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
