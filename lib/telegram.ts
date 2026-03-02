/**
 * Уведомления в Telegram (burkeradmin_bot).
 * Требуются: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (ID чата/группы куда слать).
 */

const BOT_API = "https://api.telegram.org/bot";

function getConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

/**
 * Отправить сообщение в Telegram. Безопасно экранирует HTML при parse_mode=HTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Отправить текстовое сообщение в настроенный чат.
 * Возвращает true при успехе, false если бот не настроен или ошибка (логируется).
 */
export async function sendTelegramMessage(
  text: string,
  options?: { parseMode?: "HTML" | "Markdown" }
): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Telegram] Не настроен TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID, пропуск отправки");
    }
    return false;
  }

  const url = `${BOT_API}${config.token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: config.chatId,
    text: text.length > 4096 ? text.slice(0, 4090) + "\n…" : text,
  };
  if (options?.parseMode === "HTML") {
    body.parse_mode = "HTML";
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      console.error("[Telegram] sendMessage error:", data.description || res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Telegram] sendMessage failed:", err);
    return false;
  }
}

/** Уведомление о новой регистрации */
export async function notifyNewRegistration(data: {
  email: string;
  firstName?: string | null;
}): Promise<boolean> {
  const name = data.firstName ? escapeHtml(data.firstName) : "—";
  const email = escapeHtml(data.email);
  const text =
    `🆕 <b>Новая регистрация</b>\n\n` +
    `Email: ${email}\n` +
    `Имя: ${name}`;
  return sendTelegramMessage(text, { parseMode: "HTML" });
}

/** Уведомление о новом заказе */
export async function notifyNewOrder(data: {
  orderNumber: string;
  orderId: string;
  email: string;
  firstName: string;
  phone: string;
  totalAmount: number;
  itemsCount: number;
  items: Array<{ productName: string; quantity: number }>;
}): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://burker-watches.ru";
  const orderLink = `${siteUrl.replace(/\/+$/, "")}/admin/orders/${data.orderId}`;
  const itemsList = data.items
    .map((item) => `• ${escapeHtml(item.productName)}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`)
    .join("\n");
  const lines = [
    "📦 <b>Новый заказ</b>",
    "",
    `Номер: ${escapeHtml(data.orderNumber)}`,
    `Товар(ы):\n${itemsList || "—"}`,
    `Email: ${escapeHtml(data.email)}`,
    `Имя: ${escapeHtml(data.firstName)}`,
    `Телефон: ${escapeHtml(data.phone)}`,
    `Сумма: ${data.totalAmount.toFixed(0)} ₽`,
    `Товаров: ${data.itemsCount}`,
    "",
    `<a href="${orderLink.replace(/&/g, "&amp;")}">Ссылка на заказ</a>`,
  ];
  const text = lines.join("\n");
  return sendTelegramMessage(text, { parseMode: "HTML" });
}

/** Уведомление об обновлении курсов валют */
export async function notifyRatesUpdated(data: {
  eurRate: number;
  rubRate: number;
  source: string;
}): Promise<boolean> {
  const text =
    `💱 <b>Курсы валют обновлены</b>\n\n` +
    `Источник: ${escapeHtml(data.source)}\n` +
    `EUR: ${data.eurRate.toFixed(4)}\n` +
    `RUB: ${data.rubRate.toFixed(4)}\n` +
    `Время: ${new Date().toLocaleString("ru-RU")}`;
  return sendTelegramMessage(text, { parseMode: "HTML" });
}

/** Уведомление о результатах парсинга/импорта товаров */
export async function notifyImportResult(data: {
  added: number;
  updated: number;
  errors: number;
  total: number;
}): Promise<boolean> {
  const text =
    `📥 <b>Парсинг товаров</b>\n\n` +
    `Всего обработано: ${data.total}\n` +
    `Добавлено: ${data.added}\n` +
    `Обновлено: ${data.updated}\n` +
    `Ошибок: ${data.errors}\n` +
    `Время: ${new Date().toLocaleString("ru-RU")}`;
  return sendTelegramMessage(text, { parseMode: "HTML" });
}
