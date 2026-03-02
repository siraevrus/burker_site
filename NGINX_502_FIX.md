# Почему бывает 502 Bad Gateway и как исправить

Ошибка **502 Bad Gateway (nginx/1.18.0)** означает: nginx работает, но **бэкенд (Node.js на порту 3010) не отвечает** или отвечает с ошибкой. «Иногда» — обычно в один из перечисленных моментов.

---

## Возможные причины

### 1. Рестарт приложения (PM2)

- **autorestart** перезапускает процесс при падении.
- **max_memory_restart: "1G"** — при превышении лимита памяти PM2 перезапускает приложение.

В момент рестарта (5–30+ секунд) приложение не слушает порт 3010 → nginx получает connection refused или таймаут → **502**.

**Что сделать:** в nginx увеличить таймауты и включить повторные попытки к бэкенду (см. ниже).

---

### 2. Долгий холодный старт Next.js

После деплоя или рестарта первый запрос к standalone-серверу может обрабатываться 10–60 секунд (инициализация Prisma, компиляция маршрутов и т.д.). Если у nginx маленький `proxy_read_timeout`, он обрывает соединение → **502**.

**Что сделать:** увеличить `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout` в конфиге nginx.

---

### 3. Маленькие таймауты nginx

Типичные значения по умолчанию — 60 секунд. При долгих запросах (импорт, тяжёлые страницы) nginx закрывает соединение до ответа приложения → **502**.

**Что сделать:** в блоке `location`, который проксирует на 3010, явно задать таймауты (см. пример ниже).

---

### 4. Приложение падает (ошибки, нехватка памяти)

Падения видны в логах PM2:

```bash
pm2 logs burker-watches --lines 100
# или
tail -100 /root/.pm2/logs/burker-watches-error.log
```

Если падения повторяются при определённых действиях (например, открытие админки, импорт) — исправлять баг или увеличить память/оптимизировать запросы.

---

## Рекомендуемый фрагмент конфига nginx

На сервере в конфиге сайта (например `/etc/nginx/sites-available/burker-watches.ru`) в блоке `location`, где делается `proxy_pass` на `http://127.0.0.1:3010`, добавьте или измените:

```nginx
location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Увеличенные таймауты — меньше 502 при рестартах и холодном старте
    proxy_connect_timeout 90s;
    proxy_send_timeout 90s;
    proxy_read_timeout 90s;

    # Повторная попытка при временной недоступности бэкенда (рестарт PM2)
    proxy_next_upstream error timeout http_502 http_503;
    proxy_next_upstream_tries 2;
    proxy_next_upstream_timeout 30s;
}
```

После правок:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Дополнительно: проверка PM2

Убедиться, что приложение поднимается и держится:

```bash
pm2 status
pm2 logs burker-watches --lines 50
```

Если после рестартов 502 пропадают через 30–60 секунд — это как раз «окно» старта приложения; настройки nginx выше должны уменьшить число видимых пользователю 502.

---

## Краткий чеклист

| Действие | Где |
|----------|-----|
| Увеличить таймауты proxy (90s) | nginx `location /` |
| Включить proxy_next_upstream для 502/503 | nginx |
| Проверить логи при падениях | `pm2 logs burker-watches` |
| При нехватке памяти — увеличить лимит или оптимизировать код | `ecosystem.config.js` → `max_memory_restart` |

Если 502 повторяются в одни и те же моменты (например, после деплоя или в 05:00 при вызове cron) — причина скорее всего рестарт или холодный старт; настройки nginx и мониторинг логов PM2 помогут подтвердить и смягчить проблему.
