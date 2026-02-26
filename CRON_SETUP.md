# Настройка cron: импорт товаров и обновление курсов валют

- **Импорт товаров** — 3 раза в день: **8:00, 14:00, 20:00 UTC** (endpoint `/api/cron/import`).
- **Курсы валют** — раз в сутки в **05:00 UTC** (endpoint `/api/cron/update-rates`). Источник: API ЦБ РФ.

## Обновление курсов валют (ЦБ РФ)

Курсы загружаются с сайта ЦБ РФ: `https://www.cbr.ru/scripts/XML_daily.asp?date_req=dd/mm/yyyy`. Параметр `date_req` — текущая дата в формате **dd/mm/yyyy**. Из ответа (XML) берутся курсы по тегам `<CharCode>USD</CharCode>` и `<CharCode>EUR</CharCode>` из поля `<Value>` (десятичный разделитель — запятая). В приложении сохраняются: **rubRate** = руб за 1 USD (значение ЦБ для USD), **eurRate** = руб за 1 USD / руб за 1 EUR (для пересчёта EUR → USD).

**Расписание:** раз в сутки в 05:00 UTC. Для 05:00 по Москве (МСК) используйте **02:00 UTC**: `"0 2 * * *"` в `vercel.json` или в настройках внешнего cron.

**Ручной вызов (с секретом):**
```bash
# Вариант 1: заголовок (Vercel, crontab)
curl -X GET "https://ваш-домен.ru/api/cron/update-rates" -H "X-Cron-Secret: ВАШ_CRON_SECRET"

# Вариант 2: query (cron-job.org и др.)
curl -X GET "https://ваш-домен.ru/api/cron/update-rates?secret=ВАШ_CRON_SECRET"

# Вариант 3: Authorization
curl -X GET "https://ваш-домен.ru/api/cron/update-rates" -H "Authorization: Bearer ВАШ_CRON_SECRET"
```

Секрет проверяется из заголовка **`X-Cron-Secret`**, **`Authorization: Bearer ...`** или query **`?secret=...`**. Переменные окружения: **`CRON_SECRET`** или **`CRON_SECRET_KEY`**.

---

## Варианты настройки (импорт)

### 1. Vercel (автоматически)

Если проект развернут на **Vercel**, cron настроен через `vercel.json`. Чтобы вызовы не отклонялись:

1. **Добавьте переменную окружения в Vercel:**  
   Project → Settings → Environment Variables → добавьте переменную **`CRON_SECRET`** (имя именно такое — Vercel передаёт его в заголовке при вызове cron).  
   Значение: случайная строка не короче 16 символов (например, сгенерируйте в 1Password или `openssl rand -hex 32`).

2. **Передеплойте проект** после добавления переменной.

3. **Проверка:** Vercel Dashboard → Cron Jobs → убедитесь, что задача есть; при необходимости откройте логи вызова (View Logs).

**Ограничение тарифа Hobby:** на бесплатном плане cron может запускаться **только 1 раз в день**. Расписание «3 раза в день» будет работать только на платных планах (Pro и выше). На Hobby измените в `vercel.json` расписание на одно срабатывание в день, например `"0 12 * * *"`.

---

### 2. Внешний cron сервис (рекомендуется для других платформ)

Используйте внешние сервисы для вызова API endpoint:

#### Вариант A: Использовать `/api/cron/import` (с защитой)

**URL для вызова:**
```
GET https://ваш-домен.ru/api/cron/import?secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
```

**Или с заголовком:**
```
GET https://ваш-домен.ru/api/cron/import
Authorization: Bearer ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
```

**Переменные окружения** (достаточно одной):
- **`CRON_SECRET`** — используется Vercel при вызове cron (подставьте тот же ключ в настройках проекта).
- **`CRON_SECRET_KEY`** — альтернатива для внешних cron (например, cron-job.org).

#### Вариант B: Использовать `/api/admin/import/auto` (с защитой)

**URL для вызова:**
```
GET https://ваш-домен.ru/api/admin/import/auto?secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
```

**Или с заголовком:**
```
GET https://ваш-домен.ru/api/admin/import/auto
Authorization: Bearer ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
```

⚠️ **Важно:** если `CRON_SECRET` настроен, endpoint отклонит любой запрос без корректного секрета (401).

---

### 3. Настройка через внешние сервисы

#### Cron-job.org (бесплатный)

1. Зарегистрируйтесь на https://cron-job.org
2. Импорт — создайте задачу:
   - **URL:** `https://ваш-домен.ru/api/cron/import?secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ`
   - **Расписание:** `0 8,14,20 * * *` (8:00, 14:00, 20:00 UTC)
   - **Метод:** GET
3. Курсы валют — создайте вторую задачу:
   - **URL:** `https://ваш-домен.ru/api/cron/update-rates?secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ`
   - **Расписание:** `0 5 * * *` (раз в сутки в 05:00 UTC)
   - **Метод:** GET

#### EasyCron

1. Зарегистрируйтесь на https://www.easycron.com
2. Создайте cron job с теми же параметрами

#### UptimeRobot (мониторинг + cron)

1. Зарегистрируйтесь на https://uptimerobot.com
2. Создайте HTTP(s) Monitor с расписанием

---

### 4. Настройка на собственном сервере (Linux)

Если у вас есть доступ к серверу, настройте cron через **crontab**.

#### Шаг 1. Секрет в переменных окружения

Убедитесь, что в `.env.production` (или в переменных PM2) задана переменная:

```bash
CRON_SECRET=ваша_длинная_случайная_строка_не_короче_16_символов
```

Сгенерировать можно так: `openssl rand -hex 32`. После изменения перезапустите приложение: `pm2 restart --update-env`.

#### Шаг 2. Открыть crontab

```bash
crontab -e
```

(Если запускаете от root — будет системный crontab; от своего пользователя — пользовательский.)

#### Шаг 3. Добавить записи

Вставьте **две** строки (подставьте свой домен и значение `CRON_SECRET`):

```bash
# Импорт товаров: 8:00, 14:00, 20:00 UTC (11:00, 17:00, 23:00 МСК)
0 8,14,20 * * * curl -sS -X GET "https://ваш-домен.ru/api/cron/import?secret=ВАШ_CRON_SECRET" > /dev/null 2>&1

# Курсы валют (ЦБ РФ): раз в сутки в 05:00 UTC (08:00 МСК)
0 5 * * * curl -sS -X GET "https://ваш-домен.ru/api/cron/update-rates" -H "X-Cron-Secret: ВАШ_CRON_SECRET" > /dev/null 2>&1
```

Важно:
- **Импорт** и **курсы валют** принимают секрет в query `?secret=...`, в заголовке `X-Cron-Secret` или `Authorization: Bearer ...`.

Замените `ваш-домен.ru` на ваш домен (например `burker-watches.ru`) и `ВАШ_CRON_SECRET` на то же значение, что в `CRON_SECRET`.

#### С логированием (по желанию)

```bash
0 8,14,20 * * * curl -sS -X GET "https://ваш-домен.ru/api/cron/import?secret=ВАШ_CRON_SECRET" >> /var/log/burker-import.log 2>&1
0 5 * * * curl -sS -X GET "https://ваш-домен.ru/api/cron/update-rates" -H "X-Cron-Secret: ВАШ_CRON_SECRET" >> /var/log/burker-rates.log 2>&1
```

Проверить расписание: `crontab -l`.

---

### 5. Docker / Kubernetes

Если используете Docker или Kubernetes, можно создать отдельный контейнер с cron:

**Dockerfile для cron:**
```dockerfile
FROM alpine:latest
RUN apk add --no-cache curl
COPY cron-import.sh /cron-import.sh
RUN chmod +x /cron-import.sh
CMD crond -f -l 2
```

**cron-import.sh:**
```bash
#!/bin/sh
curl -X GET "https://ваш-домен.ru/api/cron/import?secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ"
```

**crontab в контейнере:**
```
0 8,14,20 * * * /cron-import.sh
```

---

## Расписание cron

Формат: `минута час день месяц день_недели`

**Импорт товаров** (`/api/cron/import`):
- `0 8,14,20 * * *` = в 8:00, 14:00 и 20:00 UTC каждый день
- `0 11,17,23 * * *` = в 11:00, 17:00 и 23:00 UTC (для московского времени +3 часа)

**Курсы валют** (`/api/cron/update-rates`):
- `0 5 * * *` = раз в сутки в 05:00 UTC
- `0 2 * * *` = раз в сутки в 02:00 UTC (= 05:00 МСК)

**Конвертация времени:**
- UTC 8:00 = МСК 11:00
- UTC 14:00 = МСК 17:00
- UTC 20:00 = МСК 23:00
- UTC 5:00 = МСК 8:00; UTC 2:00 = МСК 5:00

---

## Проверка работы

После настройки проверьте логи:

1. **Vercel:** Dashboard → Functions → Logs
2. **Внешний cron:** Логи на сайте сервиса cron
3. **Собственный сервер:** Проверьте логи приложения или `/var/log/`

**Тестовый вызов:**
```bash
curl -X GET "https://ваш-домен.ru/api/cron/import?secret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ"
```

Должен вернуться JSON с результатом импорта.

---

## Безопасность

⚠️ **Важно:** Обязательно установите переменную окружения `CRON_SECRET_KEY` и используйте защищенный endpoint `/api/cron/import` для внешних cron сервисов.
