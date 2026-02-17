# Запуск проекта через Docker

## Требования
- Docker
- Docker Compose

## Разработка (Development)

Для запуска в режиме разработки с hot reload:

```bash
docker-compose -f docker-compose.dev.yml up
```

Приложение будет доступно по адресу: http://localhost:3000

## Production

Для запуска в production режиме:

```bash
docker-compose up -d
```

Приложение будет доступно по адресу: http://localhost:3000

## Остановка

```bash
docker-compose down
```

или для dev режима:

```bash
docker-compose -f docker-compose.dev.yml down
```

## Просмотр логов

```bash
docker-compose logs -f app
```

## Пересборка образа

```bash
docker-compose build --no-cache
```

## Доступ к базе данных

База данных SQLite сохраняется в `prisma/dev.db` и монтируется как volume, поэтому данные сохраняются между перезапусками контейнера.

## Загрузка файлов

Загруженные изображения промоблоков сохраняются в `public/promo` и также монтируются как volume.
