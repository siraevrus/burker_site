# Настройка переменных окружения на продакшн-сервере

## Где прописать CDEK_CLIENT_ID и CDEK_CLIENT_SECRET

На продакшн-сервере есть **два способа** задать переменные окружения:

---

## Способ 1: Файл `.env` в корне проекта (рекомендуется)

**На сервере** создайте файл `.env` в каталоге проекта:

```bash
cd /var/www/burker-watches.ru
nano .env
```

Добавьте в файл:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# CDEK API (Account и Secure password из личного кабинета СДЭК)
CDEK_CLIENT_ID="ваш_client_id_здесь"
CDEK_CLIENT_SECRET="ваш_client_secret_здесь"

# Секретный ключ для cron-эндпоинта обновления курсов валют
CRON_SECRET="ваш-секретный-ключ-здесь"
```

**Важно:** 
- Файл `.env` уже в `.gitignore`, он не попадёт в репозиторий
- После создания/изменения `.env` **перезапустите PM2**: `pm2 restart burker-watches`

---

## Способ 2: Через PM2 ecosystem.config.js

Если используете `ecosystem.config.js` для запуска PM2, можно указать переменные там:

```bash
cd /var/www/burker-watches.ru
nano ecosystem.config.js
```

В секции `env` добавьте:

```javascript
env: {
  NODE_ENV: "production",
  PORT: 3010,
  // ... другие переменные
  CDEK_CLIENT_ID: "ваш_client_id_здесь",
  CDEK_CLIENT_SECRET: "ваш_client_secret_здесь",
  CRON_SECRET: "ваш-секретный-ключ-здесь",
}
```

Затем перезапустите через ecosystem:
```bash
pm2 delete burker-watches
pm2 start ecosystem.config.js
pm2 save
```

---

## Способ 3: Переменные окружения системы (для PM2)

Можно задать переменные на уровне системы и PM2 их подхватит:

```bash
# В ~/.bashrc или ~/.profile
export CDEK_CLIENT_ID="ваш_client_id"
export CDEK_CLIENT_SECRET="ваш_client_secret"
export CRON_SECRET="ваш-секретный-ключ"
```

Затем перезапустите PM2:
```bash
pm2 restart burker-watches
```

---

## Проверка, что переменные загружены

После настройки проверьте логи PM2:

```bash
pm2 logs burker-watches --lines 50
```

Или проверьте через PM2:

```bash
pm2 env 0
```

Если переменные не подхватились, перезапустите PM2:

```bash
pm2 restart burker-watches
```

---

## Где взять CDEK_CLIENT_ID и CDEK_CLIENT_SECRET

1. Зайдите в [личный кабинет СДЭК](https://api.cdek.ru/)
2. Перейдите в раздел "API" или "Настройки API"
3. Найдите **Account** (это `CDEK_CLIENT_ID`) и **Secure password** (это `CDEK_CLIENT_SECRET`)

---

## Текущий способ запуска на сервере

Судя по выводу `pm2 show`, приложение запущено через:
```bash
pm2 start npm --name "burker-watches" -- start
```

В этом случае переменные окружения берутся из:
- Файла `.env` в корне проекта (Next.js автоматически загружает `.env`)
- Системных переменных окружения

**Рекомендация:** Используйте **Способ 1** (файл `.env`) — это самый простой и безопасный вариант.
