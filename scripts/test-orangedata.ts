#!/usr/bin/env npx tsx
/**
 * Проверка работоспособности Orange Data API.
 * Использует lib/orange-data.ts и env-переменные.
 *
 * Запуск: npx tsx scripts/test-orangedata.ts
 * или:   ORANGEDATA_INN=... ORANGEDATA_GROUP=... npx tsx scripts/test-orangedata.ts
 */

import {
  isOrangeDataConfigured,
  sendFiscalReceipt,
} from "../lib/orange-data";

async function main() {
  console.log("=== Orange Data API — тест ===\n");

  if (!isOrangeDataConfigured()) {
    console.log("❌ Orange Data не настроен.");
    console.log("   Тест: ORANGEDATA_TEST=1 npx tsx scripts/test-orangedata.ts");
    console.log("   (сначала: npx tsx scripts/convert-xml-key-to-pem.ts)");
    process.exit(1);
  }

  console.log("✓ Конфигурация найдена\n");
  console.log("Отправка тестового чека (1 товар, 10 ₽)...\n");

  const result = await sendFiscalReceipt({
    orderId: `test-${Date.now()}`,
    email: "test@example.com",
    items: [{ name: "Тестовый товар", price: 10, quantity: 1 }],
    totalAmount: 10,
  });

  if (result.success) {
    console.log("✓ Успех! docId:", result.docId);
  } else {
    console.log("❌ Ошибка:", result.error);
    if (String(result.error).includes("Не найден ключ для подписи")) {
      console.log("\n→ Публичный ключ не зарегистрирован в Orange Data ЛК.");
      console.log("  1. npx tsx scripts/convert-xml-key-to-pem.ts");
      console.log("  2. npx tsx scripts/extract-orangedata-public-key.ts");
      console.log("  3. Скопируйте публичный ключ в https://lk.orangedata.ru → Интеграция");
      console.log("  4. Укажите ИНН 3123011520 (тест) или ваш ИНН");
    }
    process.exit(1);
  }
}

main();
