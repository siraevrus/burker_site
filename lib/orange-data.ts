/**
 * Orange Data API — фискализация чеков 54-ФЗ.
 * Использует официальную библиотеку node-orangedata.
 * Документация: https://github.com/orangedata-official/node-orangedata
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  FISCAL_GROUP,
  FISCAL_PAYMENT_TYPE_CASHLESS,
  FISCAL_TAXATION_SYSTEM_USN_INCOME,
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
