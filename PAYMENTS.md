# Оплата заказов (T-Bank EACQ СБП)

Интеграция оплаты через СБП по API **EACQ** (интернет-эквайринг): Init → GetQr, подпись запроса (Token).

Документация:
- [Токен (подпись запроса)](https://developer.tbank.ru/eacq/intro/developer/token)
- [Init — инициация платежа](https://developer.tbank.ru/eacq/api/init)
- [GetQr — ссылка или QR-код](https://developer.tbank.ru/eacq/api/get-qr)
- [Уведомления](https://developer.tbank.ru/eacq/intro/developer/notification)

## Переменные окружения

- `TBANK_TERMINAL` — идентификатор терминала (из ЛК Т-Бизнес / интернет-эквайринг).
- `TBANK_PASSWORD` — пароль терминала (участвует в расчёте подписи Token и проверке вебхуков).
- `TBANK_EACQ_BASE_URL` — опционально; по умолчанию `https://securepay.tinkoff.ru`.
- `TBANK_TOKEN` — опционально; Bearer API Token для заголовка (см. [self-service-auth](https://developer.tbank.ru/docs/intro/manuals/self-service-auth)).

Для продакшена задайте боевые `TBANK_TERMINAL` и `TBANK_PASSWORD` из личного кабинета интернет-эквайринга.

## Подпись запроса (Token)

Для каждого вызова Init и GetQr подпись считается так:
- берутся только **корневые** параметры запроса (вложенные объекты не участвуют);
- добавляется пара `Password`;
- ключи сортируются по алфавиту;
- конкатенируются **только значения** в одну строку;
- SHA-256 от строки (UTF-8) → значение поля `Token` в теле запроса.

Уведомления от T-Bank приходят с полем `Token`; проверка — тем же алгоритмом (все параметры кроме Token, без вложенных Data/Receipt, + Password, сортировка, SHA-256).

## Подключение уведомлений

1. Эндпоинт: `POST https://<ваш-домен>/api/webhooks/tbank`.
2. В методе Init мы передаём `NotificationURL` — можно не регистрировать отдельно, если URL совпадает с указанным при создании заказа.
3. При необходимости укажите URL уведомлений в настройках терминала в [личном кабинете интернет-эквайринга](https://business.tbank.ru/oplata/main).
4. Ответ на уведомление: **HTTP 200** с телом **OK** (текст, заглавными буквами).

## Сценарий

1. Пользователь оформляет заказ → создаётся заказ в БД, вызываются Init (Amount в копейках, OrderId = id заказа, SuccessURL/FailURL/NotificationURL) и GetQr (DataType=PAYLOAD) → сохраняются PaymentId и ссылка.
2. Редирект на `/order/<id>/pay`; кнопка ведёт по ссылке в СБП.
3. После оплаты T-Bank шлёт POST на `NotificationURL` с PaymentId, Status (CONFIRMED/AUTHORIZED и др.) и Token; сервер проверяет Token, обновляет заказ (paymentStatus, paidAt), отправляет письмо «Заказ оплачен».
4. Пользователь переходит по SuccessURL на страницу подтверждения заказа.

## Деплой

Убедитесь, что в таблице `Order` есть колонки `paymentStatus`, `paymentId`, `paymentLink`, `paidAt`:

- `npx prisma migrate deploy` или `npx prisma db push`

## Тестирование

- Задайте тестовые `TBANK_TERMINAL` и `TBANK_PASSWORD` из ЛК (тестовый режим).
- Запуск проверки: `npm run test:tbank` (создаёт ссылку на 10 ₽ с тестовым OrderId).

В production используйте боевые учётные данные.
