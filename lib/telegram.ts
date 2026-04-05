import { formatRub } from "./utils";

/**
 * Уведомления в Telegram (burkeradmin_bot).
 * Требуются: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (ID чата/группы куда слать).
 */

const BOT_API = "https://api.telegram.org/bot";

/** Убирает пробелы и обрамляющие кавычки из значений из .env / PM2 (частая причина «всё сломалось после правки конфига»). */
function normalizeTelegramEnv(value: string | undefined): string {
  if (!value) return "";
  let s = value.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

let loggedMissingConfig = false;

function getConfig(): { token: string; chatId: string } | null {
  const token = normalizeTelegramEnv(process.env.TELEGRAM_BOT_TOKEN);
  const chatId = normalizeTelegramEnv(process.env.TELEGRAM_CHAT_ID);
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
    if (!loggedMissingConfig) {
      loggedMissingConfig = true;
      console.warn(
        "[Telegram] Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID — уведомления отключены (проверьте PM2 ecosystem / Docker -e / .env на сервере)"
      );
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
      const err = data as { description?: string; error_code?: number; parameters?: unknown };
      console.error(
        "[Telegram] sendMessage error:",
        err.description || res.status,
        err.error_code != null ? `(code ${err.error_code})` : "",
        err.parameters != null ? JSON.stringify(err.parameters) : ""
      );
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
  lastName?: string;
  middleName?: string;
  phone: string;
  totalAmount: number;
  itemsCount: number;
  items: Array<{ productName: string; quantity: number }>;
  /** Клиент отметил «связаться для подтверждения заказа» */
  requiresConfirmation?: boolean;
}): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://burker-watches.ru";
  const orderLink = `${siteUrl.replace(/\/+$/, "")}/admin/orders?orderId=${data.orderId}`;
  const fullName = [data.lastName, data.firstName, data.middleName]
    .filter(Boolean)
    .join(" ");
  const itemsList = data.items
    .map((item) => `• ${escapeHtml(item.productName)}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`)
    .join("\n");
  const lines = [
    "📦 <b>Новый заказ</b>",
    "",
    ...(data.requiresConfirmation
      ? ["<b>Клиент просит связаться для подтверждения заказа</b>", ""]
      : []),
    `Номер: ${escapeHtml(data.orderNumber)}`,
    `Товар(ы):\n${itemsList || "—"}`,
    `Email: ${escapeHtml(data.email)}`,
    `ФИО: ${escapeHtml(fullName || data.firstName)}`,
    `Телефон: ${escapeHtml(data.phone)}`,
    `Сумма: ${formatRub(data.totalAmount)} ₽`,
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
    `EUR: ${data.eurRate.toFixed(2)}\n` +
    `RUB: ${data.rubRate.toFixed(2)}\n` +
    `Время: ${new Date().toLocaleString("ru-RU")}`;
  return sendTelegramMessage(text, { parseMode: "HTML" });
}

/** Уведомление о новом сообщении с формы обратной связи */
export async function notifyFeedback(data: {
  name: string;
  contact: string;
  comment: string;
}): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://burker-watches.ru";
  const adminLink = `${siteUrl.replace(/\/+$/, "")}/admin/feedback`;
  const text =
    `📩 <b>Форма обратной связи</b>\n\n` +
    `Имя: ${escapeHtml(data.name)}\n` +
    `Контакт: ${escapeHtml(data.contact)}\n\n` +
    `Комментарий:\n${escapeHtml(data.comment)}\n\n` +
    `<a href="${adminLink.replace(/&/g, "&amp;")}">Открыть заявки в админке</a>`;
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

/** Уведомление о сообщении в чате поддержки */
export async function notifySupportChatMessage(data: {
  sessionId: string;
  preview: string;
  isNewSession: boolean;
}): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://burker-watches.ru";
  const adminLink = `${siteUrl.replace(/\/+$/, "")}/admin/support/${encodeURIComponent(data.sessionId)}`;
  const headline = data.isNewSession
    ? "🆕 <b>Новый чат поддержки</b>"
    : "💬 <b>Сообщение в чате поддержки</b>";
  const preview =
    data.preview.length > 500 ? data.preview.slice(0, 500) + "…" : data.preview;
  const text =
    `${headline}\n\n` +
    `${escapeHtml(preview)}\n\n` +
    `<a href="${adminLink.replace(/&/g, "&amp;")}">Открыть в админке</a>`;
  return sendTelegramMessage(text, { parseMode: "HTML" });
}
