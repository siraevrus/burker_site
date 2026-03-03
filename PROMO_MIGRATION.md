# Миграция системы промо-баннеров

## Что было сделано

Система промо-баннеров полностью переписана для решения проблем с путями к файлам при сборке проекта.

### Изменения:

1. **Новое расположение файлов**: `uploads/promo/` вместо `public/promo/`
   - Файлы больше не попадают в сборку Next.js
   - Не зависят от копирования папки `public` при деплое

2. **API route для отдачи изображений**: `/api/promo-images/[filename]`
   - Гарантированная доступность файлов через API
   - Поддержка обратной совместимости со старыми путями (`public/promo/`)

3. **Обновлены все компоненты**:
   - `components/PromoBanner/PromoBanner.tsx`
   - `app/admin/promo/page.tsx`
   - `components/ProductImage.tsx`

4. **Placeholder через API**: `/api/promo-images/placeholder`
   - SVG placeholder вместо файла `placeholder.png`

## Миграция существующих данных

Для обновления путей в базе данных запустите:

```bash
tsx scripts/migrate-promo-paths.ts
```

Этот скрипт обновит все пути с `/promo/` на `/api/promo-images/` в таблице `PromoBanner`.

## Структура файлов

```
uploads/
  promo/
    promo-{timestamp}-{random}.{ext}  # Новые файлы

public/
  promo/  # Старые файлы (для обратной совместимости)
```

## API Endpoints

- `POST /api/upload-promo` - загрузка промо-изображений
- `GET /api/promo-images/[filename]` - получение промо-изображения
- `GET /api/promo-images/placeholder` - placeholder изображение

## Важно

- Папка `uploads/` добавлена в `.gitignore`
- При деплое убедитесь, что папка `uploads/promo/` существует на сервере
- Старые файлы из `public/promo/` будут работать через обратную совместимость
