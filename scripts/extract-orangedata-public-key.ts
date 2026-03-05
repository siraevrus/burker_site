#!/usr/bin/env npx tsx
/**
 * Извлечение публичного ключа из rsa_private.pem для регистрации в Orange Data.
 *
 * Orange Data проверяет подпись запроса по публичному ключу. Если ключ не зарегистрирован —
 * возникает ошибка «Не найден ключ для подписи».
 *
 * Запуск: npx tsx scripts/extract-orangedata-public-key.ts
 *
 * Шаги:
 * 1. Создайте rsa_private.pem: npx tsx scripts/convert-xml-key-to-pem.ts
 * 2. Запустите этот скрипт
 * 3. Зарегистрируйте ключ в ЛК Orange Data (https://lk.orangedata.ru)
 *    Раздел интеграции/настройки — название может отличаться. При необходимости уточните у поддержки.
 * 4. ИНН: 290124976119, название ключа: 290124976119_40633
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

const keyPath =
  process.env.ORANGEDATA_PRIVATE_KEY_PATH ||
  path.join(process.cwd(), "orange_prod", "rsa_private.pem");

if (!fs.existsSync(path.resolve(keyPath))) {
  console.error("Файл ключа не найден:", keyPath);
  console.error("\nСначала выполните:");
  console.error("  npx tsx scripts/convert-xml-key-to-pem.ts");
  process.exit(1);
}

const privatePem = fs.readFileSync(path.resolve(keyPath), "utf8");
const key = crypto.createPrivateKey(privatePem);
const publicKey = crypto.createPublicKey(key);
const publicPem = publicKey.export({ type: "spki", format: "pem" }) as string;

console.log("=== Публичный ключ для Orange Data ===\n");
console.log("Формат PEM (если ЛК принимает вставку текста):\n");
console.log(publicPem);
console.log("=== Конец ключа ===");
console.log("\nИНН: 290124976119, название ключа: 290124976119_40633");
console.log("ЛК: https://lk.orangedata.ru");
console.log("\nЕсли такого раздела в ЛК нет — загрузите rsa_2048_public_key.xml из orange_prod/");
console.log("или обратитесь в поддержку: orangedata.ru/support");
