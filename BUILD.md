# Сборка проекта

## Обычная сборка

```bash
npm run build
```

## Если сборка падает или вёрстка ломается

### 1. Чистая сборка (без кэша Next.js)

Удаляет `.next`, заново генерирует Prisma-клиент и собирает проект:

```bash
npm run build:clean
```

### 2. Полная чистая сборка (кэш Next.js и webpack)

Дополнительно очищает кэш в `node_modules/.cache`:

```bash
npm run build:full
```

### 3. Ручная последовательность (максимальный сброс)

Выполняйте по порядку, если скриптов недостаточно:

```bash
# Очистка артефактов сборки и кэшей
rm -rf .next
rm -rf node_modules/.cache

# Генерация Prisma-клиента (обязательно перед сборкой)
npx prisma generate

# Сборка в режиме production
NODE_ENV=production npm run build
```

### 4. «Ядерный» вариант (переустановка зависимостей)

Если сборка всё ещё падает (ошибки зависимостей, несовместимые версии):

```bash
# Удалить сборку и зависимости
rm -rf .next node_modules

# Установить зависимости строго по lockfile (рекомендуется на проде)
npm ci

# Сгенерировать Prisma-клиент и собрать
npx prisma generate
NODE_ENV=production npm run build
```

**Важно:** после `npm ci` все пакеты ставятся заново по `package-lock.json`. Не используйте `npm install` вместо `npm ci` на проде, если нужна предсказуемая сборка.

## На проде после сборки

- Приложение в режиме `standalone` лежит в `.next/standalone/`. Запуск: `node .next/standalone/server.js` из корня проекта (или из папки `standalone` с правильным `cwd`).
- Статика: `.next/static` копируется в `standalone` при сборке. Папка `public` тоже копируется в `.next/standalone/public/` — если после сборки вы добавляете файлы в `public/products/`, либо настройте nginx на раздачу из `public/products/`, либо создайте симлинк (см. документацию по деплою).

## Типичные ошибки при сборке

| Ошибка | Действие |
|--------|----------|
| `PrismaClient is not able to run in the browser` | Выполнить `npx prisma generate` и пересобрать. |
| 404 на `_next/static/chunks/` после деплоя | Сборка и статика от разных билдов. Сделать `rm -rf .next`, затем заново `npm run build` и перезапустить приложение из той же директории. |
| `Module not found` / странные ошибки импорта | Выполнить вариант 4 (переустановка через `npm ci` и полная пересборка). |
| Сломанная вёрстка при работающем сайте | Проверить, что нет 404 на CSS в Network. Если есть — полная пересборка и рестарт одного и того же билда. |

## 404 на _next/static (CSS, JS, шрифты), site.webmanifest

**Причина:** браузер получает HTML, в котором прописаны пути к файлам сборки (например `/_next/static/css/6d117a06de5a99ef.css`). Эти файлы должны лежать в `.next/standalone/.next/static/`. Next.js **по умолчанию не копирует** `public` и `.next/static` в standalone — их нужно копировать после сборки.

В этом проекте скрипты `build`, `build:clean` и `build:full` уже делают копирование:
`cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/`
Поэтому на проде обязательно используйте `npm run build` (или `build:clean`), а не только `next build`.

**Что сделать по шагам:**

1. **Одна сборка и один рестарт** (на сервере из корня проекта):
   ```bash
   cd /var/www/burker-watches.ru
   git pull
   rm -rf .next
   npx prisma generate
   NODE_ENV=production npm run build
   pm2 restart burker-watches
   ```
2. **Проверить, что статика на месте:**
   ```bash
   ls -la /var/www/burker-watches.ru/.next/standalone/.next/static/css/ | head -5
   ```
   Должны быть файлы вида `*.css`. Если папка пустая — сборка прошла некорректно.
3. **Жёсткое обновление в браузере:** Ctrl+Shift+R (или Cmd+Shift+R) или режим инкогнито, чтобы не подхватывать старый HTML и старые ссылки на чанки.

### Раздача _next/static и манифеста через nginx (рекомендуется)

Чтобы CSS, JS и шрифты отдавались напрямую с диска и не зависели от Node, добавьте в конфиг nginx **перед** `location /`:

```nginx
# Статика Next.js (CSS, JS, шрифты) — одна сборка, путь не меняется
location /_next/static/ {
    alias /var/www/burker-watches.ru/.next/standalone/.next/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Манифест и иконки из public
location = /site.webmanifest {
    alias /var/www/burker-watches.ru/.next/standalone/public/site.webmanifest;
    add_header Cache-Control "public, max-age=86400";
}
```

Если `site.webmanifest` лежит в корне проекта в `public/site.webmanifest`, при сборке он копируется в `.next/standalone/public/`. После каждой сборки обновляются и `.next/static`, и `public` внутри standalone.

После правок nginx: `sudo nginx -t && sudo systemctl reload nginx`.
