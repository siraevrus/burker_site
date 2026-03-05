# Orange Data API — план и интеграция

> **Важное уточнение:** Orange Data — это НЕ платёжная форма, а **сервис фискализации** (54-ФЗ).  
> Платёжная форма уже подключена через **T-Bank EACQ** (карты, СБП).  
> Orange Data отвечает за передачу чеков в ФНС через ОФД.

---

## 1. Текущее состояние

### Что уже есть

| Компонент | Статус |
|-----------|--------|
| Платёжная форма | T-Bank (Init → PaymentURL) |
| Чеки при оплате | Receipt передаётся в T-Bank Init (FFD 1.05) |
| Webhook при оплате | `/api/webhooks/tbank` |
| Сертификаты Orange Data | Папка `orange/`: `290124976119_40633.*`, `client_ca.crt` |

### Что даёт Orange Data

- Отправка фискальных чеков напрямую в ОФД Orange Data
- Соответствие 54-ФЗ при онлайн-продажах
- Независимость от банка: чек формируется вашим сервисом

---

## 2. Ресурсы Orange Data

- **Репозиторий:** [orangedata-official/API](https://github.com/orangedata-official/API)
- **Документация:** `orangedata_API_English_ffd_1.2.pdf`, `orangedata_API_Russian_ffd_1.2.pdf`
- **Подпись:** X-Signature (SHA256-RSA 2048 бит, base64 в заголовке)
- **Endpoint:** `https://api.orangedata.ru:12003/api/v2/documents/`
- **Кодировка:** CP866 (по docs) / UTF-8 (часто работает)

---

## 3. Этапы интеграции

### Этап 1. Подготовка инфраструктуры

1. **Сертификаты**
   - У вас уже есть `290124976119_40633.crt`, `.key`, `.pfx` (ИНН_ИД)
   - `client_ca.crt` — публичный ключ для проверки клиентского сертификата
   - Нужен приватный ключ для подписи запросов: `rsa_2048_private_key.xml` (или эквивалент)
   - Генератор ключей для prod: `Nebula.KeysGenerator-1.2.0.0.zip` из репозитория

2. **Переменные окружения** (в `.env`):

   ```env
   # Orange Data (фискализация 54-ФЗ)
   ORANGEDATA_API_URL=https://api.orangedata.ru:12003/api/v2/documents/
   ORANGEDATA_INN=290124976119
   ORANGEDATA_GROUP=40633
   # Путь к ключам (или содержимое в env)
   ORANGEDATA_PRIVATE_KEY_PATH=./orange/rsa_2048_private_key.xml
   ORANGEDATA_CLIENT_CERT_PATH=./orange/290124976119_40633.pfx
   ORANGEDATA_CLIENT_CERT_PASSWORD=1234
   ```

3. **Тестовый контур**
   - В документации указан тестовый endpoint
   - Используйте `files_for_test` из репозитория для проверки

---

### Этап 2. Библиотека для работы с API

1. Создать модуль `lib/orange-data.ts`:
   - Функция подписи: body JSON → SHA256-RSA(private key) → base64 → `X-Signature`
   - mTLS: использование PFX для клиентской аутентификации при HTTPS
   - Формирование тела запроса по формату FFD 1.2

2. Структура запроса (по документации API):
   - `id` — уникальный идентификатор документа (UUID)
   - `inn` — ИНН организации
   - `group` — идентификатор группы ККТ
   - `key` — ключ документа (обычно orderId)
   - `content` — закодированный в base64 JSON чека (FFD 1.05/1.2)
   - и т.д.

3. Конвертация в CP866 (если требуется) для полей `content`.

---

### Этап 3. Отправка чека при оплате

**Точка интеграции:** вебхук T-Bank → после обновления `paymentStatus` на `paid`.

В `app/api/webhooks/tbank/route.ts` добавить:

```ts
// После успешной оплаты (isPaid && statusChanged && !wasPaid):
if (isOrangeDataConfigured()) {
  await sendFiscalReceiptToOrangeData(order).catch((err) => {
    logError('OrangeData', 'sendReceipt', err);
    // Не падаем: письмо и Telegram уже отправлены
  });
}
```

**Данные чека:**
- Товары: `order.items` (productName, productPrice, quantity)
- Доставка: `order.shippingCost`
- Скидка: `order.promoDiscount`
- Email: `order.email`
- Итог: `order.totalAmount`

---

### Этап 4. Формат FFD 1.2

Сверка с `orangedata_API_English_ffd_1.2.pdf`:

- `type` = "1" (приход)
- `taxationType` = "usn_income" (или ваша система налогообложения)
- `items` — массив позиций с `name`, `price`, `quantity`, `amount`, `vat`, `paymentMethod`, `paymentObject`
- `payments` — способ оплаты (электронный)
- `customerContact` — email покупателя

---

### Этап 5. Проверка статуса и повторная отправка

1. API Orange Data позволяет проверять статус документа
2. Добавить в БД поле `Order.fiscalReceiptId` (или `orangeDataDocId`) для отслеживания
3. При необходимости — endpoint для повторной отправки чека (если первая попытка failed)

---

### Этап 6. Админка (опционально)

- Список заказов: показывать статус фискализации (отправлен / ошибка / не отправлен)
- Кнопка «Повторно отправить чек в Orange Data» для заказов с ошибкой

---

## 4. Порядок работ (чеклист)

| # | Задача | Сложность |
|---|--------|-----------|
| 1 | Изучить PDF `orangedata_API_Russian_ffd_1.2.pdf` (формат тела запроса) | — |
| 2 | Получить/сгенерировать `rsa_2048_private_key.xml` (если ещё нет) | низкая |
| 3 | Создать `lib/orange-data.ts` (подпись, mTLS, POST) | средняя |
| 4 | Добавить `sendFiscalReceiptToOrangeData(order)` | средняя |
| 5 | Интегрировать вызов в webhook T-Bank | низкая |
| 6 | Миграция: `Order.fiscalReceiptId`, `Order.fiscalReceiptStatus` | низкая |
| 7 | Тестирование на тестовом контуре Orange Data | средняя |
| 8 | Обработка ошибок и логирование | низкая |

---

## 5. Риски и учёт

1. **Дублирование чеков:** T-Bank уже формирует чек (Receipt в Init). Уточните у бухгалтерии, нужен ли дополнительный чек через Orange Data или достаточно T-Bank.
2. **Кодировка:** В части документации указан CP866 — проверить на тестовом контуре.
3. **Сертификаты:** В production нужны сертификаты, выданные Orange Data (через Nebula.KeysGenerator или их процедуру).

---

## 6. Ссылки

- [GitHub orangedata-official/API](https://github.com/orangedata-official/API)
- [OFD.ru — Ferma + Orange Data](https://ofd.ru/razrabotchikam/ferma/orangedata)
- [Orange Data — поддержка](https://orangedata.ru/support)
