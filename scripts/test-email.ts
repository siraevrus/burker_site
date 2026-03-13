import "./load-env";
import { sendEmailViaMailopost } from "../lib/mailopost";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function printUsage() {
  console.log("Использование:");
  console.log("  tsx scripts/test-email.ts --to user@example.com --send");
  console.log("");
  console.log("Опции:");
  console.log("  --to, -t    Email получателя");
  console.log("  --send      Реально отправить письмо");
  console.log("  --help      Показать справку");
  console.log("");
  console.log("По умолчанию скрипт работает в безопасном режиме и ничего не отправляет.");
}

function parseArgs(argv: string[]) {
  let to = "";
  let shouldSend = false;
  let showHelp = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--to" || arg === "-t") {
      to = argv[i + 1] || "";
      i += 1;
      continue;
    }

    if (arg === "--send") {
      shouldSend = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      showHelp = true;
    }
  }

  return { to, shouldSend, showHelp };
}

async function testEmail() {
  const { to, shouldSend, showHelp } = parseArgs(process.argv.slice(2));

  if (showHelp) {
    printUsage();
    return;
  }

  if (!to) {
    console.error("Не указан получатель. Используйте --to user@example.com");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!EMAIL_RE.test(to)) {
    console.error(`Некорректный email получателя: ${to}`);
    process.exitCode = 1;
    return;
  }

  console.log("Подготовка тестового письма...");
  console.log(`Получатель: ${to}`);
  console.log(`API Token настроен: ${process.env.MAILOPOST_API_TOKEN ? "Да" : "Нет"}`);
  console.log(`From Email: ${process.env.MAILOPOST_FROM_EMAIL || "не настроен"}`);

  if (!shouldSend) {
    console.log("");
    console.log("Безопасный режим: письмо не отправлено.");
    console.log("Добавьте флаг --send для реальной отправки.");
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Тестовое письмо от Mira Brands | Burker</h2>
      <p>Здравствуйте!</p>
      <p>Это тестовое письмо для проверки работы Mailopost API.</p>
      <p>Если вы получили это письмо, значит интеграция работает корректно! ✅</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;"><a href="${process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://burker-watches.ru"}" style="color: #999; text-decoration: none;">Mira Brands | Burker</a></p>
      <p style="color: #999; font-size: 12px;">Время отправки: ${new Date().toLocaleString('ru-RU')}</p>
    </div>
  `;

  const result = await sendEmailViaMailopost(
    to,
    "Тестовое письмо от Mira Brands | Burker",
    html
  );

  if (result.success) {
    console.log("\n✅ Письмо успешно отправлено!");
    if (result.messageId) {
      console.log(`📧 ID сообщения: ${result.messageId}`);
    }
  } else {
    console.error("\n❌ Ошибка при отправке письма:");
    console.error(`Ошибка: ${result.error}`);
  }
}

testEmail().catch(console.error);
