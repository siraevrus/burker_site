/**
 * Mailopost API интеграция
 * Документация: https://mailopost.ru/api.html
 */

function getMailopostConfig() {
  return {
    apiUrl: process.env.MAILOPOST_API_URL || "https://api.mailopost.ru/v1",
    apiToken: process.env.MAILOPOST_API_TOKEN || "",
    fromEmail: process.env.MAILOPOST_FROM_EMAIL || "noreply@burker-watches.ru",
    fromName: process.env.MAILOPOST_FROM_NAME || "Mira Brands | Burker",
  };
}

interface MailopostMessage {
  from_email: string;
  from_name?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  payment?: "subscriber_priority" | "credit_priority" | "subscriber" | "credit";
}

interface MailopostResponse {
  id: number;
  from_email: string;
  from_name?: string;
  to: string;
  subject: string;
  status: string;
  events?: {
    open?: number;
    redirect?: Record<string, number>;
    spam?: number;
    unsubscribe?: number;
  };
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Отправка email через Mailopost API
 */
export async function sendEmailViaMailopost(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const config = getMailopostConfig();
  
  // Если API токен не настроен, используем fallback режим (вывод в консоль)
  if (!config.apiToken) {
    console.log("\n" + "=".repeat(60));
    console.log("📧 MAILOPOST EMAIL (fallback - токен не настроен)");
    console.log("=".repeat(60));
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`From: ${config.fromEmail}`);
    console.log("=".repeat(60) + "\n");
    return { success: true };
  }

  const message: MailopostMessage = {
    from_email: config.fromEmail,
    from_name: config.fromName,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""), // Извлекаем текст из HTML если не передан
    payment: "credit_priority", // Используем приоритет писем
  };

  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${config.apiUrl}/email/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiToken}`,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errors = errorData.errors || [];
        const errorMessage =
          errors[0]?.detail || errors[0]?.code?.toString() || `HTTP ${response.status}`;
        const errorCode = errors[0]?.code ?? response.status;
        lastError = `${errorCode}: ${errorMessage}`;

        console.error("[Mailopost] Ошибка отправки:", {
          attempt,
          status: response.status,
          code: errorCode,
          detail: errorMessage,
          full: errorData,
        });

        if (attempt < MAX_ATTEMPTS && RETRYABLE_STATUSES.has(response.status)) {
          await sleep(500 * attempt);
          continue;
        }
        return { success: false, error: lastError };
      }

      const data: MailopostResponse = await response.json();
      if (attempt > 1) {
        console.log(`[Mailopost] Отправка успешна после ретрая: попытка ${attempt}`);
      }
      return { success: true, messageId: data.id };
    } catch (error: unknown) {
      const messageText = error instanceof Error ? error.message : "Unknown error";
      lastError = messageText;
      console.error("[Mailopost] Сетевая ошибка отправки:", {
        attempt,
        error: messageText,
      });
      if (attempt < MAX_ATTEMPTS) {
        await sleep(500 * attempt);
        continue;
      }
    }
  }

  return { success: false, error: lastError };
}
