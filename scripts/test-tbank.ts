/**
 * Проверка интеграции T-Bank СБП из терминала.
 * Загружает .env.local и .env, затем создаёт тестовую одноразовую ссылку на оплату (1 ₽).
 *
 * Запуск: npx tsx scripts/test-tbank.ts
 * Или:   node --env-file=.env.local --env-file=.env --import tsx scripts/test-tbank.ts
 */
import dotenv from "dotenv";
import { resolve } from "path";

// Загружаем env до импорта lib/tbank (там читаются TBANK_* при загрузке модуля)
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const tbank = await import("../lib/tbank");

  if (!tbank.isTbankConfigured()) {
    console.error("❌ T-Bank не настроен. Задайте TBANK_TOKEN или TBANK_TERMINAL+TBANK_PASSWORD и TBANK_ACCOUNT_NUMBER в .env или .env.local");
    process.exit(1);
  }

  const accountNumber = tbank.getAccountNumber();
  if (!accountNumber) {
    console.error("❌ TBANK_ACCOUNT_NUMBER не задан (20 или 22 цифры).");
    process.exit(1);
  }

  const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://burker-watches.ru";
  console.log("Проверка T-Bank СБП: запрос одноразовой ссылки на 1 ₽...");
  console.log("Редирект после оплаты:", redirectUrl);

  try {
    const result = await tbank.createOneTimePaymentLink({
      accountNumber,
      sum: 1,
      purpose: "Проверка интеграции СБП",
      ttl: 1,
      vat: "0",
      redirectUrl,
    });
    console.log("\n✅ T-Bank отвечает, ссылка создана.");
    console.log("qrId:", result.qrId);
    console.log("Ссылка:", result.link);
  } catch (err) {
    console.error("\n❌ Ошибка T-Bank:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
