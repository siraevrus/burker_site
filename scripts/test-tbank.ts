/**
 * Проверка интеграции T-Bank EACQ СБП из терминала.
 * Загружает .env.local и .env, затем создаёт тестовую платёжную сессию (Init + GetQr) на 10 ₽.
 *
 * Запуск: npx tsx scripts/test-tbank.ts
 * Или:   node --env-file=.env.local --env-file=.env --import tsx scripts/test-tbank.ts
 */
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const tbank = await import("../lib/tbank");

  if (!tbank.isTbankConfigured()) {
    console.error(
      "❌ T-Bank не настроен. Задайте TBANK_TERMINAL и TBANK_PASSWORD в .env или .env.local"
    );
    process.exit(1);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://burker-watches.ru";
  const successUrl = `${baseUrl}/order-confirmation?paid=1`;
  const failUrl = baseUrl + "/order-confirmation";
  const notificationUrl = `${baseUrl}/api/webhooks/tbank`;
  const orderId = "test-" + Date.now();

  console.log("Проверка T-Bank EACQ СБП: Init + GetQr на 10 ₽ (1000 коп.)...");
  console.log("OrderId:", orderId);
  console.log("SuccessURL:", successUrl);

  try {
    const result = await tbank.createOneTimePaymentLink({
      orderId,
      amountKopecks: 1000,
      description: "Проверка интеграции СБП",
      successUrl,
      failUrl,
      notificationUrl,
    });
    console.log("\n✅ T-Bank отвечает, ссылка создана.");
    console.log("PaymentId (qrId):", result.qrId);
    console.log("Ссылка:", result.link);
  } catch (err) {
    console.error("\n❌ Ошибка T-Bank:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
