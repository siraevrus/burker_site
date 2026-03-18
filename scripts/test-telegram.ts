/**
 * Проверка Telegram-бота: переменные окружения, getMe, отправка тестового сообщения.
 * Запуск: npx tsx scripts/test-telegram.ts
 */
import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";
import { sendTelegramMessage } from "../lib/telegram";

config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  console.log("TELEGRAM_BOT_TOKEN:", token ? `${token.slice(0, 10)}…` : "не задан");
  console.log("TELEGRAM_CHAT_ID:", chatId || "не задан");
  console.log("");

  if (!token || !chatId) {
    console.error("Задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env или .env.local");
    process.exit(1);
  }

  // Проверка бота через getMe
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (data.ok) {
      console.log("Бот:", data.result.username);
    } else {
      console.error("getMe ошибка:", data.description || res.status);
      process.exit(1);
    }
  } catch (e) {
    console.error("getMe запрос не удался:", e);
    process.exit(1);
  }

  // Отправка тестового сообщения
  console.log("Отправка тестового сообщения в чат…");
  const sent = await sendTelegramMessage(
    "🧪 Тест от Буркер: бот работает. " + new Date().toLocaleString("ru-RU"),
    { parseMode: "HTML" }
  );
  if (sent) {
    console.log("Сообщение отправлено.");
  } else {
    console.error("Не удалось отправить сообщение (проверьте TELEGRAM_CHAT_ID и что бот добавлен в чат).");
    process.exit(1);
  }
}

main();
