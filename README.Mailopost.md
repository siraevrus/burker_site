# Настройка Mailopost Email API

Проект использует [Mailopost](https://mailopost.ru) для отправки email уведомлений.

## Переменные окружения

Добавьте следующие переменные в ваш `.env.local` или `.env` файл:

```env
# Mailopost API Configuration
MAILOPOST_API_URL=https://api.mailopost.ru/v1
MAILOPOST_API_TOKEN=your_api_token_here
MAILOPOST_FROM_EMAIL=noreply@burker-watches.ru
MAILOPOST_FROM_NAME=MiraShop | Burker

# Admin email for order notifications
ADMIN_EMAIL=info@kondratov.online
```

## Текущие настройки

- **API Token**: `0e214eeceb83783a7ed4dc025a0175b1`
- **From Email**: `noreply@burker-watches.ru`
- **From Name**: `MiraShop | Burker`
- **Admin Email**: `info@kondratov.online`

## Типы отправляемых писем

1. **Код верификации email** - при регистрации пользователя
2. **Подтверждение заказа** - после создания заказа
3. **Уведомление админу** - о новом заказе
4. **Восстановление пароля** - код для сброса пароля

## Режим разработки

В режиме разработки (если `MAILOPOST_API_TOKEN` не настроен), письма не отправляются через API, а информация выводится в консоль для удобства тестирования.

## Документация API

Полная документация Mailopost API: https://mailopost.ru/api.html

## SMTP (альтернативный способ)

Если нужно использовать SMTP вместо API:

- **Host**: `smtp.msndr.net`
- **Port**: `25`, `587` (STARTTLS) или `465` (TLS/SSL)
- **Username**: `info@kondratov.online`
- **Password**: `0e214eeceb83783a7ed4dc025a0175b1`

Обратите внимание: текущая реализация использует только API метод отправки.
