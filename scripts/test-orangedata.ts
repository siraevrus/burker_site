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
    process.exit(1);
  }
}

main();
