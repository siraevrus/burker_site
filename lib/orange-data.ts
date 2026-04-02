/**
 * Orange Data API — фискализация чеков 54-ФЗ.
 * Использует официальную библиотеку node-orangedata.
 * Документация: https://github.com/orangedata-official/node-orangedata
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { logError, logEvent } from "./ops-log";
import {
  FISCAL_GROUP,
  FISCAL_CHECK_PAYMENT_PREPAYMENT,
  FISCAL_PAYMENT_TYPE_CASHLESS,
  FISCAL_COMMISSION_LABEL,
  FISCAL_CLOSING_CDEK_INN,
  FISCAL_CLOSING_CDEK_SUPPLIER_NAME,
  FISCAL_CLOSING_SHIPPING_NAME,
  FISCAL_TAXATION_SYSTEM_USN_INCOME,
  FISCAL_AGENT_TYPE_COMMISSIONER,
  FISCAL_SUPPLIER_INN,
  FISCAL_SUPPLIER_NAME,
  FISCAL_TAX_NO_VAT,
  FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
  FISCAL_PAYMENT_SUBJECT_PRODUCT,
  FISCAL_PAYMENT_SUBJECT_SERVICE,
  FISCAL_PAYMENT_SUBJECT_AGENT_FEE,
  type ClosingFiscalInput,
  buildClosingFiscalReceiptData,
} from "./fiscal-receipt";

const ORANGEDATA_INN_DEFAULT = "290124976119";
const ORANGEDATA_KEY_NAME = "290124976119_40633";

const ORANGEDATA_API_URL =
  process.env.ORANGEDATA_API_URL || "https://api.orangedata.ru:12003/api/v2";
const ORANGEDATA_INN =
  (process.env.ORANGEDATA_INN || "").trim() || ORANGEDATA_INN_DEFAULT;
const ORANGEDATA_GROUP = FISCAL_GROUP;

const ORANGE_PROD = path.join(process.cwd(), "orange_prod");
const ORANGEDATA_PRIVATE_KEY_PATH =
  (process.env.ORANGEDATA_PRIVATE_KEY_PATH || "").trim() ||
  path.join(ORANGE_PROD, "rsa_private.pem");
const ORANGEDATA_CLIENT_CERT_KEY_PATH =
  (process.env.ORANGEDATA_CLIENT_CERT_KEY_PATH || "").trim() ||
  path.join(ORANGE_PROD, `${ORANGEDATA_KEY_NAME}.key`);
const ORANGEDATA_CLIENT_CERT_CRT_PATH = path.join(ORANGE_PROD, `${ORANGEDATA_KEY_NAME}.crt`);
const ORANGEDATA_CLIENT_CERT_PASSWORD =
  process.env.ORANGEDATA_CLIENT_CERT_PASSWORD || "1234";
const ORANGEDATA_CA_PATH =
  (process.env.ORANGEDATA_CA_PATH || "").trim() ||
  path.join(ORANGE_PROD, "client_ca.crt");
const ORANGEDATA_TLS_INSECURE = process.env.ORANGEDATA_TLS_INSECURE === "1";

export interface OrangeDataReceiptItem {
  name: string;
  price: number;
  quantity: number;
  tax?: number;
  paymentMethodType?: number;
  paymentSubjectType?: number;
  supplierINN?: string;
  supplierInfo?: {
    name: string;
    phoneNumbers?: string[];
  };
  agentType?: number;
}

export interface OrangeDataReceiptParams {
  orderId: string;
  email: string;
  taxationSystem?: number;
  items: OrangeDataReceiptItem[];
  totalAmount: number;
}

function getOrangeProdFiles() {
  const certPath = path.resolve(ORANGEDATA_CLIENT_CERT_CRT_PATH);
  const keyPath = path.resolve(ORANGEDATA_CLIENT_CERT_KEY_PATH);
  const privateKeyPath = path.resolve(ORANGEDATA_PRIVATE_KEY_PATH);

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) return null;

  const privateKey = fs.existsSync(privateKeyPath)
    ? fs.readFileSync(privateKeyPath, "utf8")
    : null;
  if (!privateKey) return null;

  const caPathRes = path.resolve(ORANGEDATA_CA_PATH);
  const ca = fs.existsSync(caPathRes) ? fs.readFileSync(caPathRes) : fs.readFileSync(certPath);

  return {
    apiUrl: ORANGEDATA_API_URL,
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    passphrase: ORANGEDATA_CLIENT_CERT_PASSWORD,
    ca,
    privateKey,
    strictSSL: !ORANGEDATA_TLS_INSECURE,
  };
}

/**
 * Проверяет, настроена ли интеграция Orange Data (технически: файлы, ИНН, группа).
 */
export function isOrangeDataConfigured(): boolean {
  const files = getOrangeProdFiles();
  return !!(files && ORANGEDATA_INN && ORANGEDATA_GROUP);
}

/**
 * Проверяет, включена ли фискализация: настроена технически И не отключена в админке.
 */
export async function isOrangeDataEnabled(): Promise<boolean> {
  if (!isOrangeDataConfigured()) return false;
  const { isOrangeDataDisabled } = await import("./orange-data-settings");
  return !(await isOrangeDataDisabled());
}

/**
 * Диагностика: какие файлы найдены/отсутствуют и почему конфиг не проходит.
 */
export function getOrangeDataDiagnostics(): {
  paths: { path: string; exists: boolean; note?: string }[];
  configOk: boolean;
  failReason?: string;
} {
  const certPath = path.resolve(ORANGEDATA_CLIENT_CERT_CRT_PATH);
  const keyPath = path.resolve(ORANGEDATA_CLIENT_CERT_KEY_PATH);
  const privateKeyPath = path.resolve(ORANGEDATA_PRIVATE_KEY_PATH);
  const caPath = path.resolve(ORANGEDATA_CA_PATH);

  const certExists = fs.existsSync(certPath);
  const keyExists = fs.existsSync(keyPath);
  const privExists = fs.existsSync(privateKeyPath);
  const privContent = privExists ? fs.readFileSync(privateKeyPath, "utf8") : "";
  const privEmpty = privExists && !privContent.trim();

  let failReason: string | undefined;
  if (!certExists || !keyExists) failReason = "нет crt или key";
  else if (!privExists) failReason = "нет rsa_private.pem";
  else if (privEmpty) failReason = "rsa_private.pem пустой или не читается";

  const configOk = !!(certExists && keyExists && privExists && privContent.trim());
  const innOk = !!ORANGEDATA_INN;
  const groupOk = !!ORANGEDATA_GROUP;
  if (configOk && (!innOk || !groupOk)) {
    failReason = !innOk
      ? "ORANGEDATA_INN пустой в .env"
      : "ORANGEDATA_GROUP пустой в .env";
  }

  return {
    paths: [
      { path: certPath, exists: certExists },
      { path: keyPath, exists: keyExists },
      { path: privateKeyPath, exists: privExists, note: privEmpty ? "(файл пустой)" : undefined },
      { path: caPath, exists: fs.existsSync(caPath) },
    ],
    configOk,
    failReason,
  };
}

/**
 * Формирует и отправляет фискальный чек в Orange Data через node-orangedata.
 */
export async function sendFiscalReceipt(
  params: OrangeDataReceiptParams
): Promise<{ success: boolean; docId?: string; error?: string }> {
  if (!(await isOrangeDataEnabled())) {
    return { success: false, error: "Orange Data не настроен или отключён в админке" };
  }

  const files = getOrangeProdFiles();
  if (!files) {
    return { success: false, error: "Файлы сертификатов не найдены в orange_prod/" };
  }

  try {
    const { OrangeData, Order } = await import("node-orangedata");

    const agent = new OrangeData(files as Record<string, unknown>);

    const order = new Order({
      id: params.orderId.length <= 64 ? params.orderId : crypto.randomUUID(),
      inn: ORANGEDATA_INN,
      group: ORANGEDATA_GROUP,
      key: ORANGEDATA_KEY_NAME, // идентификатор ключа для проверки подписи (ИНН_id)
      type: 1,
      ffdVersion: 4, // ФФД 1.2 (касса в ЛК Orange Data настроена на этот режим)
      customerContact: params.email,
      taxationSystem: params.taxationSystem ?? FISCAL_TAXATION_SYSTEM_USN_INCOME,
    });

    for (const item of params.items) {
      order.addPosition({
        text: item.name.slice(0, 128),
        quantity: item.quantity,
        price: item.price,
        tax: item.tax ?? 6,
        paymentMethodType: item.paymentMethodType ?? 4,
        paymentSubjectType: item.paymentSubjectType ?? 1,
        supplierINN: item.supplierINN,
        supplierInfo: item.supplierInfo,
        agentType: item.agentType,
      });
    }
    order.addPayment({ type: FISCAL_PAYMENT_TYPE_CASHLESS, amount: params.totalAmount });

    await agent.sendOrder(order);

    return {
      success: true,
      docId: order.id,
    };
  } catch (err: unknown) {
    const { OrangeDataError, OrangeDataApiError } = await import("node-orangedata/lib/errors").catch(
      () => ({ OrangeDataError: Error, OrangeDataApiError: Error })
    );

    let message = err instanceof Error ? err.message : String(err);
    if (err instanceof OrangeDataApiError) {
      message = (err as { errors?: string[] }).errors?.join("; ") ?? message;
    } else if (err instanceof OrangeDataError) {
      message = (err as { message: string }).message;
    }

    return {
      success: false,
      error: typeof message === "string" ? message : JSON.stringify(message),
    };
  }
}

const FFD_QTY_UNIT_PIECE = 0;

/**
 * Закрывающий чек к авансу при статусе «В пути в РФ»: 3 позиции, оплата за счёт предоплаты (тип 3).
 */
export async function sendClosingFiscalReceipt(
  params: ClosingFiscalInput & { orderId: string; email: string }
): Promise<{ success: boolean; docId?: string; error?: string }> {
  if (!(await isOrangeDataEnabled())) {
    return { success: false, error: "Orange Data не настроен или отключён в админке" };
  }

  const built = buildClosingFiscalReceiptData(params);
  if (!built.ok) {
    logError("OrangeData_closingReceipt_build", {
      orderId: params.orderId,
      error: built.error,
    });
    return { success: false, error: built.error };
  }
  const { nameLine1, line1Rub, line2Rub, line3Rub } = built;

  const totalAmount = Number((line1Rub + line2Rub + line3Rub).toFixed(2));

  const files = getOrangeProdFiles();
  if (!files) {
    logError("OrangeData_closingReceipt_certs", {
      orderId: params.orderId,
      error: "Нет client.crt/key или rsa_private.pem в orange_prod/",
    });
    return { success: false, error: "Файлы сертификатов не найдены в orange_prod/" };
  }

  try {
    const { OrangeData, Order } = await import("node-orangedata");
    const agent = new OrangeData(files as Record<string, unknown>);

    const docId =
      params.orderId.length <= 64 ? params.orderId : crypto.randomUUID();

    const order = new Order({
      id: docId,
      inn: ORANGEDATA_INN,
      group: ORANGEDATA_GROUP,
      key: ORANGEDATA_KEY_NAME,
      type: 1,
      ffdVersion: 4,
      customerContact: params.email,
      taxationSystem: FISCAL_TAXATION_SYSTEM_USN_INCOME,
    });

    order.addPosition({
      text: nameLine1,
      quantity: 1,
      price: line1Rub,
      tax: FISCAL_TAX_NO_VAT,
      paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
      paymentSubjectType: FISCAL_PAYMENT_SUBJECT_PRODUCT,
      supplierINN: FISCAL_SUPPLIER_INN,
      supplierInfo: { name: FISCAL_SUPPLIER_NAME },
      agentType: FISCAL_AGENT_TYPE_COMMISSIONER,
      quantityMeasurementUnit: FFD_QTY_UNIT_PIECE,
    });

    order.addPosition({
      text: FISCAL_CLOSING_SHIPPING_NAME.slice(0, 128),
      quantity: 1,
      price: line2Rub,
      tax: FISCAL_TAX_NO_VAT,
      paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
      paymentSubjectType: FISCAL_PAYMENT_SUBJECT_SERVICE,
      supplierINN: FISCAL_CLOSING_CDEK_INN,
      supplierInfo: { name: FISCAL_CLOSING_CDEK_SUPPLIER_NAME },
      agentType: FISCAL_AGENT_TYPE_COMMISSIONER,
      quantityMeasurementUnit: FFD_QTY_UNIT_PIECE,
    });

    order.addPosition({
      text: FISCAL_COMMISSION_LABEL.slice(0, 128),
      quantity: 1,
      price: line3Rub,
      tax: FISCAL_TAX_NO_VAT,
      paymentMethodType: FISCAL_PAYMENT_METHOD_FULL_PAYMENT,
      paymentSubjectType: FISCAL_PAYMENT_SUBJECT_AGENT_FEE,
      quantityMeasurementUnit: FFD_QTY_UNIT_PIECE,
    });

    order.addPayment({ type: FISCAL_CHECK_PAYMENT_PREPAYMENT, amount: totalAmount });

    logEvent("OrangeData_closingReceipt_api_send", {
      orderId: params.orderId,
      docId,
      paymentType: FISCAL_CHECK_PAYMENT_PREPAYMENT,
      totalRub: totalAmount,
      positionsRub: [line1Rub, line2Rub, line3Rub],
    });

    await agent.sendOrder(order);

    logEvent("OrangeData_closingReceipt_api_ok", {
      orderId: params.orderId,
      docId: order.id,
    });

    return { success: true, docId: order.id };
  } catch (err: unknown) {
    const { OrangeDataError, OrangeDataApiError } = await import("node-orangedata/lib/errors").catch(
      () => ({ OrangeDataError: Error, OrangeDataApiError: Error })
    );

    let message = err instanceof Error ? err.message : String(err);
    const extra: Record<string, unknown> = {};
    if (err instanceof OrangeDataApiError) {
      const e = err as {
        errors?: string[];
        statusCode?: number;
        body?: string;
        message: string;
      };
      message = e.errors?.join("; ") ?? message;
      if (e.statusCode != null) extra.statusCode = e.statusCode;
      if (e.body != null) extra.bodyPreview = String(e.body).slice(0, 500);
    } else if (err instanceof OrangeDataError) {
      message = (err as { message: string }).message;
    }

    logError("OrangeData_closingReceipt_api_error", {
      orderId: params.orderId,
      error: message,
      ...extra,
    });

    return {
      success: false,
      error: typeof message === "string" ? message : JSON.stringify(message),
    };
  }
}
