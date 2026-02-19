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

  try {
    const message: MailopostMessage = {
      from_email: config.fromEmail,
      from_name: config.fromName,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Извлекаем текст из HTML если не передан
      payment: "credit_priority", // Используем приоритет писем
    };

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
      const errorMessage = errorData.errors?.[0]?.detail || `HTTP ${response.status}`;
      console.error("Mailopost API error:", errorMessage);
      return { success: false, error: errorMessage };
    }

    const data: MailopostResponse = await response.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error("Error sending email via Mailopost:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}
