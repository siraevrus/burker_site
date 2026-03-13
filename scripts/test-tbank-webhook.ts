import "./load-env";
import crypto from "crypto";

/**
 * Тестирование webhook T-Bank: имитирует POST от T-Bank с подписанным Token.
 *
 * Использование:
 *   npx tsx scripts/test-tbank-webhook.ts --payment-id 123456789 --status CONFIRMED
 *   npx tsx scripts/test-tbank-webhook.ts --payment-id 123456789 --status EXPIRED
 *
 * Статусы:
 *   CONFIRMED  — оплата подтверждена (клиент получит письма "Заказ принят" + "Заказ оплачен")
 *   AUTHORIZED — холдирование (письмо НЕ уходит, проверяем что дублирования нет)
 *   EXPIRED    — истёк срок оплаты (письмо "Заказ не оплачен")
 *   CANCELLED  — отменён (письмо "Заказ не оплачен")
 */

const STATUSES_WITH_SUCCESS = ["CONFIRMED", "AUTHORIZED"];

function buildToken(params: Record<string, unknown>, password: string): string {
  const withPassword: Record<string, unknown> = { ...params, Password: password };
  const keys = Object.keys(withPassword)
    .filter((k) => k !== "Token")
    .filter((k) => {
      const v = withPassword[k];
      return v === null || (typeof v !== "object" && typeof v !== "function");
    })
    .sort();
  const concat = keys.map((k) => String(withPassword[k] ?? "")).join("");
  return crypto.createHash("sha256").update(concat, "utf8").digest("hex");
}

function parseArgs(argv: string[]) {
  let paymentId = "";
  let status = "CONFIRMED";
  let showHelp = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === "--payment-id" || arg === "-p") && argv[i + 1]) {
      paymentId = argv[++i];
    } else if ((arg === "--status" || arg === "-s") && argv[i + 1]) {
      status = argv[++i].toUpperCase();
    } else if (arg === "--help" || arg === "-h") {
      showHelp = true;
    }
  }

  return { paymentId, status, showHelp };
}

function printUsage() {
  console.log("Использование:");
  console.log("  npx tsx scripts/test-tbank-webhook.ts --payment-id <ID> [--status <STATUS>]");
  console.log("");
  console.log("Опции:");
  console.log("  --payment-id, -p   PaymentId из T-Bank (обязательно)");
  console.log("  --status, -s       Статус вебхука (по умолчанию: CONFIRMED)");
  console.log("                     CONFIRMED | AUTHORIZED | EXPIRED | CANCELLED");
  console.log("  --help             Показать справку");
  console.log("");
  console.log("Примеры:");
  console.log("  npx tsx scripts/test-tbank-webhook.ts --payment-id 123456789");
  console.log("  npx tsx scripts/test-tbank-webhook.ts --payment-id 123456789 --status EXPIRED");
}

async function main() {
  const { paymentId, status, showHelp } = parseArgs(process.argv.slice(2));

  if (showHelp) {
    printUsage();
    return;
  }

  if (!paymentId) {
    console.error("Ошибка: не указан --payment-id");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const password = process.env.TBANK_PASSWORD;
  if (!password) {
    console.error("Ошибка: TBANK_PASSWORD не задан в .env");
    process.exitCode = 1;
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://burker-watches.ru";
  const webhookUrl = `${siteUrl}/api/webhooks/tbank`;

  const success = STATUSES_WITH_SUCCESS.includes(status);
  const params: Record<string, unknown> = {
    PaymentId: paymentId,
    Success: success,
    Status: status,
  };
  const token = buildToken(params, password);

  const body = { ...params, Token: token };

  console.log("─────────────────────────────────────────");
  console.log("T-Bank webhook: тестовый запрос");
  console.log("─────────────────────────────────────────");
  console.log(`URL:       ${webhookUrl}`);
  console.log(`PaymentId: ${paymentId}`);
  console.log(`Status:    ${status}`);
  console.log(`Success:   ${success}`);
  console.log(`Token:     ${token}`);
  console.log("─────────────────────────────────────────");
  console.log("Ожидаемое поведение:");
  if (status === "CONFIRMED") {
    console.log("  ✅ Заказ → paid");
    console.log("  📧 Письмо клиенту: 'Спасибо за заказ!' + 'Оплата получена'");
    console.log("  📱 Telegram-уведомление");
  } else if (status === "AUTHORIZED") {
    console.log("  ⏳ Заказ остаётся pending, письма НЕ уходят (холдирование)");
  } else if (status === "EXPIRED" || status === "DEADLINE_EXPIRED") {
    console.log("  ⌛ Заказ → expired");
    console.log("  📧 Письмо клиенту: 'Заказ не оплачен'");
  } else if (status === "CANCELLED" || status === "CANCELED") {
    console.log("  ❌ Заказ → cancelled");
    console.log("  📧 Письмо клиенту: 'Заказ не оплачен'");
  }
  console.log("─────────────────────────────────────────");
  console.log("Отправка...\n");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  console.log(`HTTP статус: ${response.status} ${response.statusText}`);
  console.log(`Ответ:       ${responseText}`);

  if (response.ok && responseText.trim() === "OK") {
    console.log("\n✅ Webhook принят успешно");
  } else if (response.status === 403) {
    console.log("\n❌ Неверный Token — проверь TBANK_PASSWORD");
  } else if (response.status === 200 && responseText !== "OK") {
    console.log("\n⚠️  Сервер вернул 200, но не 'OK' — возможно заказ не найден");
  } else {
    console.log("\n❌ Неожиданный ответ от сервера");
  }
}

main().catch(console.error);
