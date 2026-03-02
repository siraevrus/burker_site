/**
 * T-Bank EACQ: оплата СБП через Init + GetQr.
 * Документация: https://developer.tbank.ru/eacq/intro/developer/token
 * Init: https://developer.tbank.ru/eacq/api/init
 * GetQr: https://developer.tbank.ru/eacq/api/get-qr
 */

import crypto from "crypto";

const TBANK_EACQ_BASE_URL =
  process.env.TBANK_EACQ_BASE_URL || "https://securepay.tinkoff.ru";
const TBANK_TERMINAL = process.env.TBANK_TERMINAL;
const TBANK_PASSWORD = process.env.TBANK_PASSWORD;
const TBANK_TOKEN = process.env.TBANK_TOKEN; // опционально: Bearer для заголовка

export interface CreateOneTimeLinkParams {
  orderId: string; // идентификатор заказа в системе мерчанта (до 36 символов)
  amountKopecks: number; // сумма в копейках (мин. 1000 = 10 руб)
  description: string; // описание заказа (до 140 символов), отображается в банке
  successUrl: string;
  failUrl: string;
  notificationUrl: string;
  redirectDueDate?: string; // срок жизни ссылки: YYYY-MM-DDTHH:MI:SS+00:00
}

export interface CreateOneTimeLinkResult {
  qrId: string; // PaymentId из Init (для вебхука)
  link: string; // ссылка из GetQr (DataType=PAYLOAD)
}

export interface TbankApiError {
  message?: string;
  code?: string;
  ErrorCode?: string;
}

/**
 * Формирует подпись запроса (Token) по документации EACQ.
 * Параметры корневого уровня (вложенные объекты/массивы не участвуют) + Password, сортировка по ключу, конкатенация значений, SHA-256.
 */
function buildToken(params: Record<string, unknown>, password: string): string {
  const withPassword = { ...params, Password: password };
  const keys = Object.keys(withPassword)
    .filter((k) => k !== "Token")
    .filter((k) => {
      const v = withPassword[k];
      return v === null || (typeof v !== "object" && typeof v !== "function");
    })
    .sort();
  const concat = keys
    .map((k) => String(withPassword[k] ?? ""))
    .join("");
  return crypto.createHash("sha256").update(concat, "utf8").digest("hex");
}

function getAuthHeader(): string | undefined {
  if (TBANK_TOKEN) {
    return `Bearer ${TBANK_TOKEN}`;
  }
  return undefined;
}

/**
 * Инициирует платёж (Init). Возвращает PaymentId для GetQr и вебхука.
 */
async function initPayment(params: CreateOneTimeLinkParams): Promise<number> {
  const redirectDueDate =
    params.redirectDueDate ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().replace(/\.\d{3}Z$/, "+00:00");
    })();

  const body: Record<string, unknown> = {
    TerminalKey: TBANK_TERMINAL,
    Amount: params.amountKopecks,
    OrderId: params.orderId.slice(0, 36),
    Description: params.description.slice(0, 140),
    SuccessURL: params.successUrl,
    FailURL: params.failUrl,
    NotificationURL: params.notificationUrl,
    RedirectDueDate: redirectDueDate,
  };

  const token = buildToken(body, TBANK_PASSWORD!);
  body.Token = token;

  const url = `${TBANK_EACQ_BASE_URL}/v2/Init`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const auth = getAuthHeader();
    if (auth) headers.Authorization = auth;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        (data.message as string) ??
        (data.Message as string) ??
        (data.ErrorMessage as string) ??
        `HTTP ${res.status}`;
      console.error("T-Bank Init error:", res.status, errMsg);
      throw new Error(`T-Bank Init: ${errMsg}`);
    }

    const success = data.Success === true || data.Success === "true";
    if (!success) {
      const errMsg =
        (data.message as string) ??
        (data.Message as string) ??
        "Unknown error";
      throw new Error(`T-Bank Init: ${errMsg}`);
    }

    const paymentId = data.PaymentId ?? data.PaymentID;
    if (paymentId === undefined || paymentId === null) {
      console.error("T-Bank Init unexpected response:", data);
      throw new Error("T-Bank Init: в ответе нет PaymentId");
    }
    return Number(paymentId);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Получает ссылку на оплату СБП по PaymentId (GetQr, DataType=PAYLOAD).
 */
async function getQrLink(paymentId: number): Promise<string> {
  const body: Record<string, unknown> = {
    TerminalKey: TBANK_TERMINAL,
    PaymentId: paymentId,
    DataType: "PAYLOAD",
  };

  const token = buildToken(body, TBANK_PASSWORD!);
  body.Token = token;

  const url = `${TBANK_EACQ_BASE_URL}/v2/GetQr`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const auth = getAuthHeader();
    if (auth) headers.Authorization = auth;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        (data.message as string) ??
        (data.Message as string) ??
        `HTTP ${res.status}`;
      console.error("T-Bank GetQr error:", res.status, errMsg);
      throw new Error(`T-Bank GetQr: ${errMsg}`);
    }

    const success = data.Success === true || data.Success === "true";
    if (!success) {
      const errMsg =
        (data.message as string) ??
        (data.Message as string) ??
        "Unknown error";
      throw new Error(`T-Bank GetQr: ${errMsg}`);
    }

    const link =
      (data.Data as string) ??
      (data.Payload as string) ??
      (data.Url as string) ??
      (data.Link as string);
    if (!link || typeof link !== "string") {
      console.error("T-Bank GetQr unexpected response:", data);
      throw new Error("T-Bank GetQr: в ответе нет Data (ссылки)");
    }
    return link;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Создаёт одноразовую ссылку на оплату через СБП: Init → GetQr (PAYLOAD).
 * qrId — PaymentId для сохранения в заказе и приёма вебхука.
 */
export async function createOneTimePaymentLink(
  params: CreateOneTimeLinkParams
): Promise<CreateOneTimeLinkResult> {
  if (!TBANK_TERMINAL || !TBANK_PASSWORD) {
    throw new Error("T-Bank: задайте TBANK_TERMINAL и TBANK_PASSWORD");
  }
  if (params.amountKopecks < 1000) {
    throw new Error("T-Bank: минимальная сумма СБП 10 руб (1000 коп.)");
  }
  if (params.orderId.length > 36) {
    throw new Error("T-Bank: OrderId не более 36 символов");
  }

  const paymentId = await initPayment(params);
  const link = await getQrLink(paymentId);
  return { qrId: String(paymentId), link };
}

/**
 * Проверяет, настроена ли интеграция T-Bank EACQ.
 */
export function isTbankConfigured(): boolean {
  return Boolean(TBANK_TERMINAL && TBANK_PASSWORD);
}

/**
 * Проверяет подпись уведомления EACQ (все параметры кроме Token + Password, сортировка, SHA-256).
 */
export function verifyNotificationToken(
  params: Record<string, unknown>,
  password: string
): boolean {
  const received = params.Token;
  if (typeof received !== "string") return false;
  const expected = buildToken(params, password);
  return received === expected;
}
