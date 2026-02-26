/**
 * T-Bank СБП B2B: создание одноразовой ссылки на оплату.
 * Документация: https://developer.tbank.ru/docs/products/sbp-b2b
 * API: POST /api/v1/b2b/qr/onetime
 */

const TBANK_BASE_URL =
  process.env.TBANK_BASE_URL || "https://invoicing-int.tinkoff.ru";
const TBANK_TERMINAL = process.env.TBANK_TERMINAL;
const TBANK_PASSWORD = process.env.TBANK_PASSWORD;
const TBANK_TOKEN = process.env.TBANK_TOKEN; // Bearer (например TBankSandboxToken для песочницы)
const TBANK_ACCOUNT_NUMBER = process.env.TBANK_ACCOUNT_NUMBER;

export type TbankVat = "0" | "10" | "20";

export interface CreateOneTimeLinkParams {
  accountNumber: string; // 20 или 22 цифры
  sum: number; // сумма в рублях
  purpose: string; // до 210 символов
  ttl: number; // срок жизни ссылки, дни
  vat: TbankVat;
  redirectUrl: string; // до 1024 символов
}

export interface CreateOneTimeLinkResult {
  qrId: string;
  link: string;
}

export interface TbankApiError {
  message?: string;
  code?: string;
}

function getAuthHeader(): string {
  if (TBANK_TOKEN) {
    return `Bearer ${TBANK_TOKEN}`;
  }
  if (TBANK_TERMINAL && TBANK_PASSWORD) {
    const encoded = Buffer.from(
      `${TBANK_TERMINAL}:${TBANK_PASSWORD}`,
      "utf-8"
    ).toString("base64");
    return `Basic ${encoded}`;
  }
  throw new Error("T-Bank: задайте TBANK_TOKEN или TBANK_TERMINAL+TBANK_PASSWORD");
}

/**
 * Создаёт одноразовую ссылку на оплату через СБП.
 * В случае ошибки API выбрасывает ошибку с сообщением.
 */
export async function createOneTimePaymentLink(
  params: CreateOneTimeLinkParams
): Promise<CreateOneTimeLinkResult> {
  const { accountNumber, sum, purpose, ttl, vat, redirectUrl } = params;

  if (!/^(\d{20}|\d{22})$/.test(accountNumber)) {
    throw new Error(
      "T-Bank accountNumber должен содержать 20 или 22 цифры"
    );
  }
  if (purpose.length > 210) {
    throw new Error("T-Bank purpose не более 210 символов");
  }
  if (redirectUrl.length > 1024) {
    throw new Error("T-Bank redirectUrl не более 1024 символов");
  }

  const url = `${TBANK_BASE_URL}/api/v1/b2b/qr/onetime`;
  const body = {
    accountNumber,
    sum: Number(sum),
    purpose: purpose.slice(0, 210),
    ttl: Number(ttl),
    vat: String(vat) as TbankVat,
    redirectUrl: redirectUrl.slice(0, 1024),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg =
        (data as TbankApiError).message ||
        (typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : `HTTP ${res.status}`);
      console.error("T-Bank createOneTimePaymentLink error:", res.status, errMsg);
      throw new Error(`T-Bank: ${errMsg}`);
    }

    // Ожидаем в ответе qrId и link (или аналогичные поля по документации)
    const qrId =
      (data as { qrId?: string }).qrId ??
      (data as { id?: string }).id ??
      (data as { paymentId?: string }).paymentId;
    const link =
      (data as { link?: string }).link ??
      (data as { url?: string }).url ??
      (data as { paymentUrl?: string }).paymentUrl;

    if (!qrId || !link) {
      console.error("T-Bank unexpected response shape:", data);
      throw new Error("T-Bank: неверный формат ответа (нет qrId или link)");
    }

    return { qrId: String(qrId), link: String(link) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Проверяет, настроена ли интеграция T-Bank (достаточно для создания ссылки).
 */
export function isTbankConfigured(): boolean {
  if (TBANK_TOKEN) return true;
  if (TBANK_TERMINAL && TBANK_PASSWORD && TBANK_ACCOUNT_NUMBER) return true;
  return false;
}

/**
 * Возвращает номер счёта для оплаты (из env или переданный).
 */
export function getAccountNumber(override?: string): string | null {
  return override || TBANK_ACCOUNT_NUMBER || null;
}
