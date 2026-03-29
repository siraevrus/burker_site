/**
 * T-Bank EACQ: оплата через Init → PaymentURL (редирект на платёжную форму).
 * Поддерживает карты и СБП — способы задаются в ЛК терминала.
 * Документация: https://developer.tbank.ru/eacq/intro/developer/token
 * Init: https://developer.tbank.ru/eacq/api/init
 * Платёжная форма: https://developer.tbank.ru/eacq/scenarios/payments/nonPCI
 */

import crypto from "crypto";

const TBANK_TERMINAL = process.env.TBANK_TERMINAL;

function getBaseUrl(): string {
  if (process.env.TBANK_EACQ_BASE_URL) {
    return process.env.TBANK_EACQ_BASE_URL;
  }
  // По документации: DEMO терминал → запросы на боевую среду securepay.tinkoff.ru
  // (не на rest-api-test, который для терминала БЕЗ DEMO с белым списком IP)
  return "https://securepay.tinkoff.ru";
}
const TBANK_PASSWORD = process.env.TBANK_PASSWORD;
const TBANK_TOKEN = process.env.TBANK_TOKEN; // опционально: Bearer для заголовка

/** Срок жизни ссылки на оплату по умолчанию (RedirectDueDate = сейчас + TTL). */
const DEFAULT_PAYMENT_LINK_TTL_MS = 6 * 60 * 60 * 1000;

/** Позиция чека для Receipt (EACQ FFD 1.05) */
export interface ReceiptItem {
  name: string;
  price: number; // в копейках
  quantity: number;
  amount: number; // price * quantity, в копейках
  tax?: "none" | "vat0" | "vat10" | "vat20";
  paymentMethod?: "full_payment" | "full_prepayment";
  paymentObject?: "commodity" | "service";
}

/** Объект Receipt для Init (обязателен при онлайн-кассе, для теста №7 — формирование чека) */
export interface ReceiptParams {
  email: string;
  taxation: "osn" | "usn_income" | "usn_income_outcome" | "patent";
  items: ReceiptItem[];
}

export interface CreateOneTimeLinkParams {
  orderId: string; // идентификатор заказа в системе мерчанта (до 36 символов)
  amountKopecks: number; // сумма в копейках (мин. 1000 = 10 руб)
  description: string; // описание заказа (до 140 символов), отображается в банке
  successUrl: string;
  failUrl: string;
  notificationUrl: string;
  /** ISO8601 (напр. 2019-06-25T13:08:40+03:00). По умолчанию — через 6 ч от Init. */
  redirectDueDate?: string;
  receipt?: ReceiptParams; // для чека (обязательно при онлайн-кассе, для теста №7)
}

export interface CreateOneTimeLinkResult {
  qrId: string; // PaymentId из Init (для вебхука)
  link: string; // PaymentURL — ссылка на платёжную форму (карта/СБП)
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
  const withPassword: Record<string, unknown> = { ...params, Password: password };
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

function getInitDebugContext(body: Record<string, unknown>) {
  const receipt = body.Receipt as
    | {
        Email?: string;
        Taxation?: string;
        Items?: Array<{ Amount?: number }>;
        Payments?: { Electronic?: number };
      }
    | undefined;

  return {
    url: `${getBaseUrl()}/v2/Init`,
    terminalKey: typeof body.TerminalKey === "string"
      ? `${body.TerminalKey.slice(0, 4)}***${body.TerminalKey.slice(-4)}`
      : body.TerminalKey,
    amount: body.Amount,
    orderId: body.OrderId,
    description: body.Description,
    successUrl: body.SuccessURL,
    failUrl: body.FailURL,
    notificationUrl: body.NotificationURL,
    redirectDueDate: body.RedirectDueDate,
    hasReceipt: Boolean(receipt),
    receipt: receipt
      ? {
          email: receipt.Email,
          taxation: receipt.Taxation,
          itemsCount: Array.isArray(receipt.Items) ? receipt.Items.length : 0,
          itemsAmountSum: Array.isArray(receipt.Items)
            ? receipt.Items.reduce((sum, item) => sum + Number(item.Amount ?? 0), 0)
            : 0,
          paymentsElectronic: receipt.Payments?.Electronic,
        }
      : undefined,
  };
}

/**
 * Результат Init: PaymentId для вебхука и PaymentURL для редиректа на платёжную форму.
 * PaymentURL — универсальная ссылка: карта, СБП и др. в зависимости от настроек терминала.
 */
interface InitResult {
  paymentId: number;
  paymentUrl: string;
}

/**
 * Инициирует платёж (Init). Возвращает PaymentId и PaymentURL.
 */
async function initPayment(params: CreateOneTimeLinkParams): Promise<InitResult> {
  const redirectDueDate =
    params.redirectDueDate ??
    (() => {
      const d = new Date(Date.now() + DEFAULT_PAYMENT_LINK_TTL_MS);
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

  if (params.receipt) {
    const r = params.receipt;
    const itemsSum = r.items.reduce((s, i) => s + i.amount, 0);
    body.Receipt = {
      FfdVersion: "1.05",
      Email: r.email.slice(0, 64),
      Taxation: r.taxation,
      Items: r.items.map((i) => ({
        Name: i.name.slice(0, 128),
        Price: i.price,
        Quantity: i.quantity,
        Amount: i.amount,
        Tax: i.tax ?? "none",
        PaymentMethod: i.paymentMethod ?? "full_payment",
        PaymentObject: i.paymentObject ?? "commodity",
      })),
      Payments: { Electronic: itemsSum },
    };
  }

  const token = buildToken(body, TBANK_PASSWORD!);
  body.Token = token;

  const url = `${getBaseUrl()}/v2/Init`;
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
      console.error("T-Bank Init error:", {
        status: res.status,
        statusText: res.statusText,
        error: errMsg,
        response: data,
        request: getInitDebugContext(body),
      });
      throw new Error(`T-Bank Init: ${errMsg}`);
    }

    const success = data.Success === true || data.Success === "true";
    if (!success) {
      const errMsg =
        (data.message as string) ??
        (data.Message as string) ??
        "Unknown error";
      console.error("T-Bank Init unsuccessful response:", {
        error: errMsg,
        response: data,
        request: getInitDebugContext(body),
      });
      throw new Error(`T-Bank Init: ${errMsg}`);
    }

    const paymentId = data.PaymentId ?? data.PaymentID;
    if (paymentId === undefined || paymentId === null) {
      console.error("T-Bank Init unexpected response:", data);
      throw new Error("T-Bank Init: в ответе нет PaymentId");
    }
    const paymentUrl = (data.PaymentURL ?? data.PaymentUrl ?? data.paymentURL) as
      | string
      | undefined;
    if (!paymentUrl || typeof paymentUrl !== "string") {
      console.error("T-Bank Init unexpected response:", data);
      throw new Error("T-Bank Init: в ответе нет PaymentURL");
    }
    return { paymentId: Number(paymentId), paymentUrl };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Создаёт одноразовую ссылку на оплату: Init → PaymentURL.
 * PaymentURL ведёт на платёжную форму банка (карта, СБП — по настройкам терминала).
 * Без СБП: в ЛК включите только карты в «Готовая платёжная форма».
 */
export async function createOneTimePaymentLink(
  params: CreateOneTimeLinkParams
): Promise<CreateOneTimeLinkResult> {
  if (!TBANK_TERMINAL || !TBANK_PASSWORD) {
    throw new Error("T-Bank: задайте TBANK_TERMINAL и TBANK_PASSWORD");
  }
  if (params.amountKopecks < 1000) {
    throw new Error("T-Bank: минимальная сумма 10 руб (1000 коп.)");
  }
  if (params.orderId.length > 36) {
    throw new Error("T-Bank: OrderId не более 36 символов");
  }

  const { paymentId, paymentUrl } = await initPayment(params);
  return { qrId: String(paymentId), link: paymentUrl };
}

/**
 * Проверяет, настроена ли интеграция T-Bank EACQ.
 */
export function isTbankConfigured(): boolean {
  return Boolean(TBANK_TERMINAL && TBANK_PASSWORD);
}

/**
 * Отменяет платёж (Cancel). Для теста №8: Init с Receipt → Cancel с PaymentId.
 * Документация: https://developer.tbank.ru/eacq/api/cancel
 */
export interface CancelPaymentParams {
  paymentId: string | number; // PaymentId из Init
  amountKopecks?: number; // опционально; если не передан, используется Amount из Init
  receipt?: ReceiptParams; // опционально; для частичной отмены (для полной отмены не передаём)
}

export interface CancelPaymentResult {
  success: boolean;
  status?: string;
  newAmount?: number;
}

export async function cancelPayment(
  params: CancelPaymentParams
): Promise<CancelPaymentResult> {
  if (!TBANK_TERMINAL || !TBANK_PASSWORD) {
    throw new Error("T-Bank: задайте TBANK_TERMINAL и TBANK_PASSWORD");
  }

  const body: Record<string, unknown> = {
    TerminalKey: TBANK_TERMINAL,
    PaymentId: String(params.paymentId),
  };

  if (params.amountKopecks !== undefined) {
    body.Amount = params.amountKopecks;
  }

  if (params.receipt) {
    const r = params.receipt;
    const itemsSum = r.items.reduce((s, i) => s + i.amount, 0);
    body.Receipt = {
      FfdVersion: "1.05",
      Email: r.email.slice(0, 64),
      Taxation: r.taxation,
      Items: r.items.map((i) => ({
        Name: i.name.slice(0, 128),
        Price: i.price,
        Quantity: i.quantity,
        Amount: i.amount,
        Tax: i.tax ?? "none",
        PaymentMethod: i.paymentMethod ?? "full_payment",
        PaymentObject: i.paymentObject ?? "commodity",
      })),
      Payments: { Electronic: itemsSum },
    };
  }

  const token = buildToken(body, TBANK_PASSWORD!);
  body.Token = token;

  const url = `${getBaseUrl()}/v2/Cancel`;
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
      console.error("T-Bank Cancel error:", res.status, errMsg);
      throw new Error(`T-Bank Cancel: ${errMsg}`);
    }

    const success = data.Success === true || data.Success === "true";
    if (!success) {
      const errMsg =
        (data.message as string) ??
        (data.Message as string) ??
        "Unknown error";
      throw new Error(`T-Bank Cancel: ${errMsg}`);
    }

    const status = (data.Status ?? data.status) as string | undefined;
    const newAmount = data.NewAmount as number | undefined;

    return {
      success: true,
      status,
      newAmount,
    };
  } finally {
    clearTimeout(timeout);
  }
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
