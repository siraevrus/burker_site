#!/usr/bin/env npx tsx
/**
 * Проверка Orange Data API (боевая среда).
 * Загружает .env для ORANGEDATA_TLS_INSECURE и других переменных.
 *
 * Запуск: npx tsx scripts/check-orangedata.ts
 */

import "./load-env";
import {
  isOrangeDataConfigured,
  sendFiscalReceipt,
  getOrangeDataDiagnostics,
} from "../lib/orange-data";
import path from "path";

async function main() {
  console.log("=== Orange Data API ===\n");
  console.log("CWD:", process.cwd());

  if (!isOrangeDataConfigured()) {
    console.log("❌ Orange Data не настроен.\n");
    const diag = getOrangeDataDiagnostics();
    for (const { path: p, exists, note } of diag.paths) {
      const rel = path.relative(process.cwd(), p) || p;
      console.log(`   ${exists ? "✓" : "✗"} ${rel}${note ? " " + note : ""}`);
    }
    if (diag.failReason) {
      console.log("\n   Причина:", diag.failReason);
    } else {
      console.log("\n   (все файлы найдены — проверьте INN/GROUP в .env)");
    }
    console.log("\n   CWD для путей:", process.cwd());
    console.log("   INN:", process.env.ORANGEDATA_INN ?? "(по умолчанию)");
    console.log("   GROUP:", process.env.ORANGEDATA_GROUP ?? "(по умолчанию)");
    console.log("\n   Выполните: npx tsx scripts/convert-xml-key-to-pem.ts");
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
    if (String(result.error).includes("self-signed certificate")) {
      console.log("\n→ Добавьте в .env: ORANGEDATA_TLS_INSECURE=1");
    }
    if (String(result.error).includes("Не найден ключ для подписи")) {
      console.log("\n→ Публичный ключ не зарегистрирован в Orange Data ЛК.");
      console.log("  1. npx tsx scripts/convert-xml-key-to-pem.ts");
      console.log("  2. npx tsx scripts/extract-orangedata-public-key.ts");
      console.log("  3. Зарегистрируйте ключ в https://lk.orangedata.ru");
    }
    process.exit(1);
  }
}

main();
