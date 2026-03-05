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

const ORANGEDATA_TEST = process.env.ORANGEDATA_TEST === "1" || process.env.ORANGEDATA_TEST === "true";
const DEFAULT_TEST_INN = "3123011520"; // из Python-OrangeData example, files_for_test

const DEFAULT_API_URL = ORANGEDATA_TEST
  ? "https://apip.orangedata.ru:2443/api/v2/documents/"
  : "https://api.orangedata.ru:12003/api/v2/documents/";

const ORANGEDATA_API_URL = process.env.ORANGEDATA_API_URL || DEFAULT_API_URL;
const DEFAULT_PROD_INN = "290124976119";
const DEFAULT_PROD_GROUP = "40633";
const ORANGEDATA_INN = process.env.ORANGEDATA_INN || (ORANGEDATA_TEST ? DEFAULT_TEST_INN : DEFAULT_PROD_INN);
const ORANGEDATA_GROUP = process.env.ORANGEDATA_GROUP || (ORANGEDATA_TEST ? "Main" : DEFAULT_PROD_GROUP);

const ORANGE_PROD = path.join(process.cwd(), "orange_prod");
const ORANGEDATA_PRIVATE_KEY_PATH =
  process.env.ORANGEDATA_PRIVATE_KEY_PATH ||
  (ORANGEDATA_TEST
    ? path.join(process.cwd(), "orange", "files_for_test", "rsa_private.pem")
    : path.join(ORANGE_PROD, "rsa_private.pem"));
const ORANGEDATA_PRIVATE_KEY_PEM = process.env.ORANGEDATA_PRIVATE_KEY_PEM;
const ORANGEDATA_CLIENT_CERT_PATH =
  process.env.ORANGEDATA_CLIENT_CERT_PATH ||
  (ORANGEDATA_TEST
    ? path.join(process.cwd(), "orange", "files_for_test", "client.pfx")
    : path.join(ORANGE_PROD, "290124976119_40633.pfx"));
const ORANGEDATA_CLIENT_CERT_KEY_PATH =
  process.env.ORANGEDATA_CLIENT_CERT_KEY_PATH ||
  (ORANGEDATA_TEST
    ? path.join(process.cwd(), "orange", "files_for_test", "client.key")
    : path.join(ORANGE_PROD, "290124976119_40633.key"));
const ORANGEDATA_CLIENT_CERT_CRT_PATH = ORANGEDATA_TEST
  ? path.join(process.cwd(), "orange", "files_for_test", "client.crt")
  : path.join(ORANGE_PROD, "290124976119_40633.crt");
const ORANGEDATA_CLIENT_CERT_PASSWORD =
  process.env.ORANGEDATA_CLIENT_CERT_PASSWORD || "1234";
// CA для проверки сервера: тест — cacert.pem; prod — только если явно задан (client_ca.crt подписывает наш клиент, не сервер Orange Data)
const ORANGEDATA_CA_PATH =
  process.env.ORANGEDATA_CA_PATH ||
  (ORANGEDATA_TEST ? path.join(process.cwd(), "orange", "files_for_test", "cacert.pem") : undefined);
const ORANGEDATA_TLS_INSECURE = process.env.ORANGEDATA_TLS_INSECURE === "1";

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
    (ORANGEDATA_CLIENT_CERT_PATH && fs.existsSync(path.resolve(ORANGEDATA_CLIENT_CERT_PATH))) ||
    (ORANGEDATA_CLIENT_CERT_KEY_PATH &&
      fs.existsSync(path.resolve(ORANGEDATA_CLIENT_CERT_KEY_PATH)) &&
      fs.existsSync(path.resolve(ORANGEDATA_CLIENT_CERT_CRT_PATH)));
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
    const keyPath = ORANGEDATA_CLIENT_CERT_KEY_PATH
      ? path.resolve(ORANGEDATA_CLIENT_CERT_KEY_PATH)
      : null;
    const crtPath = path.resolve(ORANGEDATA_CLIENT_CERT_CRT_PATH);

    let tlsOpts: { pfx?: Buffer; passphrase?: string; cert?: string; key?: string; ca?: string } = {};
    if (keyPath && fs.existsSync(keyPath) && fs.existsSync(crtPath)) {
      tlsOpts = {
        cert: fs.readFileSync(crtPath, "utf8"),
        key: fs.readFileSync(keyPath, "utf8"),
      };
    } else if (fs.existsSync(certPath)) {
      const pfx = fs.readFileSync(certPath);
      tlsOpts = { pfx, passphrase: ORANGEDATA_CLIENT_CERT_PASSWORD };
    }
    // ca: для теста — cacert.pem; для prod — client_ca.crt может быть для клиента, не для сервера
    if (ORANGEDATA_CA_PATH && fs.existsSync(path.resolve(ORANGEDATA_CA_PATH))) {
      tlsOpts.ca = fs.readFileSync(path.resolve(ORANGEDATA_CA_PATH), "utf8");
    }

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (ORANGEDATA_TEST ? 2443 : 12003),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Signature": signature,
        "Content-Length": Buffer.byteLength(bodyStr, "utf8"),
      },
      ...(Object.keys(tlsOpts).length > 0 && {
        ...tlsOpts,
        rejectUnauthorized: !ORANGEDATA_TLS_INSECURE,
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
