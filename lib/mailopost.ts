/**
 * Mailopost API — отправка email.
 * Документация: https://mailopost.ru/api.html
 * POST /v1/email/messages
 */

const API_URL = process.env.MAILOPOST_API_URL || "https://api.mailopost.ru/v1";
const API_TOKEN = process.env.MAILOPOST_API_TOKEN;
const FROM_EMAIL = process.env.MAILOPOST_FROM_EMAIL || "noreply@burker-watches.ru";
const FROM_NAME = process.env.MAILOPOST_FROM_NAME || "Mira Brands | Burker";

export interface SendEmailResult {
  success: boolean;
  error?: string;
  messageId?: number;
}

/**
 * Отправка письма через Mailopost API.
 */
export async function sendEmailViaMailopost(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<SendEmailResult> {
  if (!API_TOKEN) {
    console.warn("[Mailopost] API_TOKEN не настроен, письмо не отправлено:", { to, subject: subject.slice(0, 50) });
    return { success: false, error: "MAILOPOST_API_TOKEN не задан" };
  }

  const body = {
    from_email: FROM_EMAIL,
    from_name: FROM_NAME,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
    payment: "credit",
  };

  try {
    const res = await fetch(`${API_URL}/email/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        (data.errors as Array<{ detail?: string }>)?.[0]?.detail ||
        (data.detail as string) ||
        `HTTP ${res.status}`;
      console.error("[Mailopost] Ошибка отправки:", res.status, errMsg);
      return { success: false, error: errMsg };
    }

    const messageId = data.id as number | undefined;
    return { success: true, messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Mailopost] Ошибка:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Отправка письма с вложением через Mailopost API (multipart/form-data).
 */
export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  html: string,
  attachment: { filename: string; content: Buffer }
): Promise<SendEmailResult> {
  if (!API_TOKEN) {
    console.warn("[Mailopost] API_TOKEN не настроен, письмо с вложением не отправлено:", { to, subject: subject.slice(0, 50) });
    return { success: false, error: "MAILOPOST_API_TOKEN не задан" };
  }

  const formData = new FormData();
  formData.append("from_email", FROM_EMAIL);
  formData.append("from_name", FROM_NAME);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);
  formData.append("text", html.replace(/<[^>]+>/g, ""));
  formData.append("payment", "credit");
  formData.append("attachments[]", new Blob([attachment.content], { type: "application/pdf" }), attachment.filename);

  try {
    const res = await fetch(`${API_URL}/email/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: formData,
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        (data.errors as Array<{ detail?: string }>)?.[0]?.detail ||
        (data.detail as string) ||
        `HTTP ${res.status}`;
      console.error("[Mailopost] Ошибка отправки с вложением:", res.status, errMsg);
      return { success: false, error: errMsg };
    }

    const messageId = data.id as number | undefined;
    return { success: true, messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Mailopost] Ошибка отправки с вложением:", msg);
    return { success: false, error: msg };
  }
}
