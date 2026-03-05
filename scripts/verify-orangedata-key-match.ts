#!/usr/bin/env npx tsx
/**
 * Проверка: соответствует ли rsa_private.pem публичному ключу из Orange Data.
 *
 * Запуск: npx tsx scripts/verify-orangedata-key-match.ts
 *
 * Публичный ключ из ЛК (XML) — вставьте в ORANGE_PUBLIC_KEY_XML ниже или передайте как аргумент.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

// Публичный ключ из Orange Data ЛК (RSAKeyValue XML)
const ORANGE_PUBLIC_KEY_XML =
  process.argv[2] ||
  `<RSAKeyValue><Modulus>0nyBNCLigY3ucV6o1rzNPf2Y7wGlAgsxBRzfB0sromFEA91EZ2QK0c0OGI2eWLIfKcy3KKtQxoDTmmtNd+IMC+yO/E317wQkZTpLvDRKB8ENb7R/N/M6+B0ftU+LCN3G7yXW94F3hwkQ0feyI+vGZHB58wCcT5FWBprB21T/M5EH4lM5i3OHGSwDNza3DHib9Ke2o/XbM8hasboFH/LX56jwrY7JDwvBBahn0DT1pZiJXW57cVHSWSeNyx5FQQUxg+f9mXhtr5p8WT4kd62Xl34y6VM0B2zz+AU9DVFCSwt833DPDdK7vw5B9nB/QUVvm48LznuTrYUCsqdyGby0TQ==</Modulus><Exponent>AQAB</Exponent></RSAKeyValue>`;

const keyPath =
  (process.env.ORANGEDATA_PRIVATE_KEY_PATH || "").trim() ||
  path.join(process.cwd(), "orange_prod", "rsa_private.pem");

function extractModulusFromXml(xml: string): string {
  const m = xml.match(/<Modulus>([^<]+)<\/Modulus>/);
  if (!m) throw new Error("Modulus не найден в XML");
  return m[1].replace(/\s/g, "");
}

function getModulusBytesFromPrivateKey(pemPath: string): Buffer {
  const pem = fs.readFileSync(path.resolve(pemPath), "utf8");
  const key = crypto.createPrivateKey(pem);
  const publicKey = crypto.createPublicKey(key);
  const jwk = publicKey.export({ format: "jwk" }) as { n?: string };
  if (!jwk.n) throw new Error("JWK n not found");
  const b64 = jwk.n.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (b64.length % 4)) % 4;
  return Buffer.from(b64 + "====".slice(0, padding), "base64");
}

function main() {
  console.log("=== Проверка соответствия ключей ===\n");
  console.log("Файл:", keyPath);

  if (!fs.existsSync(path.resolve(keyPath))) {
    console.error("\nФайл не найден. Создайте: npx tsx scripts/convert-xml-key-to-pem.ts");
    process.exit(1);
  }

  const xmlModulusB64 = extractModulusFromXml(ORANGE_PUBLIC_KEY_XML);
  const xmlModulusBuf = Buffer.from(xmlModulusB64, "base64");
  const ourModulusBuf = getModulusBytesFromPrivateKey(keyPath);

  console.log("\nModulus из Orange Data, байт:", xmlModulusBuf.length);
  console.log("Modulus из rsa_private.pem, байт:", ourModulusBuf.length);

  const trimLeadingZero = (b: Buffer) => (b[0] === 0 ? b.subarray(1) : b);
  const xmlTrimmed = trimLeadingZero(xmlModulusBuf);
  const ourTrimmed = trimLeadingZero(ourModulusBuf);
  const match =
    xmlModulusBuf.equals(ourModulusBuf) || xmlTrimmed.equals(ourTrimmed);

  if (match) {
    console.log("\n✓ Ключи совпадают. rsa_private.pem соответствует публичному ключу Orange Data.");
    console.log("  Если всё равно «Не найден ключ для подписи» — напишите в поддержку Orange Data:");
    console.log("  поддержка@orangedata.ru или orangedata.ru/support");
  } else {
    console.log("\n✗ Ключи НЕ совпадают. rsa_private.pem — от другого ключа.");
    console.log("  Публичный ключ в ЛК соответствует другому приватному ключу.");
    console.log("  Используйте приватный ключ, соответствующий публичному в ЛК.");
    console.log("  Либо зарегистрируйте новый публичный ключ (если в ЛК есть функция добавления).");
    process.exit(1);
  }
}

main();
