/**
 * Проверка интеграции T-Bank EACQ из терминала.
 * Тест №7: Init с Receipt → формирование чека
 * Тест №8: Init с Receipt → Cancel с PaymentId
 *
 * Запуск: npx tsx scripts/test-tbank.ts
 * Или:   node --env-file=.env.production --import tsx scripts/test-tbank.ts
 */
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.production") });

async function main() {
  const tbank = await import("../lib/tbank");

  if (!tbank.isTbankConfigured()) {
    console.error(
      "❌ T-Bank не настроен. Задайте TBANK_TERMINAL и TBANK_PASSWORD в .env, .env.local или .env.production"
    );
    process.exit(1);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://burker-watches.ru";
  const successUrl = `${baseUrl}/order-confirmation?paid=1`;
  const failUrl = baseUrl + "/order-confirmation";
  const notificationUrl = `${baseUrl}/api/webhooks/tbank`;
  const orderId = "test-" + Date.now();

  console.log("Проверка T-Bank EACQ: Init → PaymentURL на 10 ₽ (1000 коп.)...");
  console.log("OrderId:", orderId);
  console.log("SuccessURL:", successUrl);

  try {
    // Тест №7: Init с Receipt
    const result = await tbank.createOneTimePaymentLink({
      orderId,
      amountKopecks: 1000,
      description: "Проверка интеграции эквайринга",
      successUrl,
      failUrl,
      notificationUrl,
      receipt: {
        email: "test@example.com",
        taxation: "usn_income",
        items: [
          { name: "Тестовый товар", price: 1000, quantity: 1, amount: 1000 },
        ],
      },
    });
    console.log("
✅ T-Bank отвечает, ссылка создана.");
    console.log("PaymentId (qrId):", result.qrId);
    console.log("Ссылка:", result.link);

    // Тест №8: Cancel с PaymentId из Init
    console.log("
📋 Тест №8: Отмена платежа...");
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Небольшая задержка перед отменой
    
    const cancelResult = await tbank.cancelPayment({
      paymentId: result.qrId,
    });
    
    if (cancelResult.success) {
      console.log("✅ Платёж успешно отменён");
      console.log("Статус:", cancelResult.status || "CANCELLED");
      if (cancelResult.newAmount !== undefined) {
        console.log("Новая сумма:", cancelResult.newAmount, "коп.");
      }
    } else {
      console.log("⚠️ Результат отмены:", cancelResult);
    }
  } catch (err) {
    console.error("
❌ Ошибка T-Bank:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
