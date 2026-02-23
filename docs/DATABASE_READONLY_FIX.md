# Ошибка «attempt to write a readonly database»

Ошибка SQLite означает, что процесс приложения не может **записать** в файл БД или в каталог `prisma`.

## На сервере (production)

Приложение в `ecosystem.config.js` запускается из `/var/www/burker-watches.ru`. Файл БД:  
`/var/www/burker-watches.ru/prisma/dev.db`

**Что сделать на сервере:**

1. Узнать, под каким пользователем крутится приложение (часто `root` при PM2):
   ```bash
   pm2 show burker-watches
   ```
   Смотрите поле «exec cwd» и от кого запущен процесс.

2. Выдать права на запись владельцу каталога и файла БД (подставьте своего пользователя вместо `root`):
   ```bash
   sudo chown -R root:root /var/www/burker-watches.ru/prisma
   sudo chmod 755 /var/www/burker-watches.ru/prisma
   sudo chmod 664 /var/www/burker-watches.ru/prisma/dev.db
   ```
   Если приложение запускается от пользователя `www-data`:
   ```bash
   sudo chown -R www-data:www-data /var/www/burker-watches.ru/prisma
   sudo chmod 755 /var/www/burker-watches.ru/prisma
   sudo chmod 664 /var/www/burker-watches.ru/prisma/dev.db
   ```

3. После деплоя каталог мог снова стать доступным только на чтение — тогда повторить `chown`/`chmod` или настроить скрипт деплоя так, чтобы он выставлял эти права после копирования файлов.

## Локально (macOS, Yandex.Disk и т.п.)

- Папка в **Yandex.Disk** во время синхронизации может становиться только для чтения или блокироваться. Решения:
  - Вынести базу из облачной папки: в `.env` указать путь к БД **вне** Yandex.Disk, например:
    ```env
    DATABASE_URL="file:/Users/ruslansiraev/cursor/burkerwatches-db/dev.db"
    ```
    и создать каталог `burkerwatches-db` и файл (например, скопировав `prisma/dev.db` или создав новую БД через `prisma db push` из этого пути).
  - Либо временно отключить синхронизацию папки проекта и проверить, исчезла ли ошибка.

- Убедиться, что текущий пользователь может писать в каталог и файл:
  ```bash
  chmod 755 prisma
  chmod 664 prisma/dev.db
  ```

## Проверка

После смены прав снова выполнить импорт товаров в админке. Если ошибка повторится — посмотреть логи PM2:

```bash
pm2 logs burker-watches --lines 50
```

И проверить, что в логах нет других ошибок доступа к файлам.
