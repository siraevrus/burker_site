#!/usr/bin/env npx tsx
/**
 * Проверка работоспособности Orange Data API (боевая среда).
 *
 * Запуск: npx tsx scripts/test-orangedata.ts
 */

import {
  isOrangeDataConfigured,
  sendFiscalReceipt,
} from "../lib/orange-data";

async function main() {
  console.log("=== Orange Data API ===\n");

  if (!isOrangeDataConfigured()) {
    console.log("❌ Orange Data не настроен.");
    console.log("   Проверьте orange_prod/ и выполните: npx tsx scripts/convert-xml-key-to-pem.ts prod");
    process.exit(1);
  }

  console.log("✓ Конфигурация найдена\n");
  console.log("Отправка чека (1 товар, 10 ₽)...\n");

  const result = await sendFiscalReceipt({
    orderId: `check-${Date.now()}`,
    email: "check@example.com",
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
      console.log("  4. Укажите ИНН 290124976119, ключ 290124976119_40633 в ЛК");
    }
    process.exit(1);
  }
}

main();
