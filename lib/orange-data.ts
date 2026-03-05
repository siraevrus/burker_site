/**
 * Orange Data API — фискализация чеков 54-ФЗ.
 * Документация: https://github.com/orangedata-official/API
 * Ferma/OFD: https://ofd.ru/razrabotchikam/ferma/orangedata
 * Endpoint: https://api.orangedata.ru:12003/api/v2/documents/
 * Подпись: X-Signature (SHA256-RSA 2048, base64)
 */

import crypto from "crypto";
import https from "https";
import fs from "fs";
import path from "path";

const ORANGEDATA_API_URL =
  process.env.ORANGEDATA_API_URL || "https://api.orangedata.ru:12003/api/v2/documents/";
const ORANGEDATA_INN = process.env.ORANGEDATA_INN;
const ORANGEDATA_GROUP = process.env.ORANGEDATA_GROUP || "Main";
const ORANGEDATA_PRIVATE_KEY_PATH = process.env.ORANGEDATA_PRIVATE_KEY_PATH;
const ORANGEDATA_PRIVATE_KEY_PEM = process.env.ORANGEDATA_PRIVATE_KEY_PEM; // альтернатива: содержимое PEM в env
const ORANGEDATA_CLIENT_CERT_PATH =
  process.env.ORANGEDATA_CLIENT_CERT_PATH ||
  path.join(process.cwd(), "orange", "290124976119_40633.pfx");
const ORANGEDATA_CLIENT_CERT_PASSWORD =
  process.env.ORANGEDATA_CLIENT_CERT_PASSWORD || "1234";

export interface OrangeDataReceiptItem {
  name: string;
  price: number; // в рублях
  quantity: number;
  tax?: number; // 1-6: 6=НДС не облагается
  paymentMethodType?: number; // 4=полный расчёт
  paymentSubjectType?: number; // 1=товар
}

export interface OrangeDataReceiptParams {
  orderId: string;
  email: string;
  taxationSystem?: number; // 1=УСН доход
  items: OrangeDataReceiptItem[];
  totalAmount: number; // в рублях
}

/**
 * Подпись тела запроса: SHA256-RSA(privateKey) → base64.
 */
function signBody(body: string, privateKeyPem: string): string {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(body, "utf8");
  sign.end();
  return sign.sign(privateKeyPem, "base64");
}

function getPrivateKeyPem(): string | null {
  if (ORANGEDATA_PRIVATE_KEY_PEM) return ORANGEDATA_PRIVATE_KEY_PEM;
  if (ORANGEDATA_PRIVATE_KEY_PATH) {
    const keyPath = path.resolve(ORANGEDATA_PRIVATE_KEY_PATH);
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, "utf8");
    }
  }
  return null;
}

/**
 * Проверяет, настроена ли интеграция Orange Data.
 */
export function isOrangeDataConfigured(): boolean {
  const hasInn = Boolean(ORANGEDATA_INN);
  const hasGroup = Boolean(ORANGEDATA_GROUP);
  const hasKey = Boolean(getPrivateKeyPem());
  const hasCert =
    ORANGEDATA_CLIENT_CERT_PATH &&
    fs.existsSync(path.resolve(ORANGEDATA_CLIENT_CERT_PATH));
  return !!(hasInn && (hasKey || hasCert));
}

/**
 * Формирует и отправляет фискальный чек в Orange Data.
 * Вызывается при успешной оплате (webhook T-Bank).
 * Формат по Ferma/Orange Data: type 1=приход, tax 6=без НДС, paymentMethodType 4, paymentSubjectType 1.
 */
export async function sendFiscalReceipt(
  params: OrangeDataReceiptParams
): Promise<{ success: boolean; docId?: string; error?: string }> {
  if (!isOrangeDataConfigured()) {
    return { success: false, error: "Orange Data не настроен" };
  }

  const inn = ORANGEDATA_INN!;
  const group = ORANGEDATA_GROUP!;
  const privateKeyPem = getPrivateKeyPem();
  if (!privateKeyPem) {
    return { success: false, error: "Приватный ключ (PEM) не задан" };
  }

  const content = {
    type: 1, // приход
    positions: params.items.map((item) => ({
      quantity: item.quantity,
      price: item.price,
      tax: item.tax ?? 6, // 6 = НДС не облагается
      text: item.name.slice(0, 128),
      paymentMethodType: item.paymentMethodType ?? 4, // полный расчёт
      paymentSubjectType: item.paymentSubjectType ?? 1, // товар
    })),
    checkClose: {
      payments: [{ type: 2, amount: params.totalAmount }], // 2 = безналичный
      taxationSystem: params.taxationSystem ?? 1, // УСН доход
    },
    customerContact: params.email,
  };

  const docId = crypto.randomUUID();
  const bodyObj = {
    id: docId,
    inn,
    group,
    key: params.orderId,
    content,
  };

  const bodyStr = JSON.stringify(bodyObj);
  const signature = signBody(bodyStr, privateKeyPem);

  return new Promise((resolve) => {
    const url = new URL(ORANGEDATA_API_URL);
    const certPath = path.resolve(ORANGEDATA_CLIENT_CERT_PATH);
    let pfx: Buffer | undefined;
    if (fs.existsSync(certPath)) {
      pfx = fs.readFileSync(certPath);
    }

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 12003,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Signature": signature,
        "Content-Length": Buffer.byteLength(bodyStr, "utf8"),
      },
      ...(pfx && {
        pfx,
        passphrase: ORANGEDATA_CLIENT_CERT_PASSWORD,
        rejectUnauthorized: true,
      }),
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, docId });
        } else {
          resolve({
            success: false,
            error: data || `HTTP ${res.statusCode}`,
          });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ success: false, error: "Timeout" });
    });

    req.write(bodyStr, "utf8");
    req.end();
  });
}
