#!/usr/bin/env npx tsx
/**
 * Извлечение публичного ключа из rsa_private.pem для регистрации в Orange Data ЛК.
 *
 * Orange Data проверяет подпись запроса по публичному ключу. Если ключ не зарегистрирован —
 * возникает ошибка «Не найден ключ для подписи».
 *
 * Запуск: npx tsx scripts/extract-orangedata-public-key.ts
 *
 * Шаги:
 * 1. Создайте rsa_private.pem: npx tsx scripts/convert-xml-key-to-pem.ts
 * 2. Запустите этот скрипт
 * 3. Скопируйте вывод (включая -----BEGIN/END-----) в ЛК Orange Data:
 *    https://lk.orangedata.ru → Интеграция → Ключ для проверки подписи
 * 4. Укажите ИНН: 290124976119, имя ключа: 290124976119_40633
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
  console.error("  npx tsx scripts/convert-xml-key-to-pem.ts prod");
  process.exit(1);
}

const privatePem = fs.readFileSync(path.resolve(keyPath), "utf8");
const key = crypto.createPrivateKey(privatePem);
const publicKey = crypto.createPublicKey(key);
const publicPem = publicKey.export({ type: "spki", format: "pem" }) as string;

console.log("=== Публичный ключ для Orange Data ===\n");
console.log("Скопируйте блок ниже целиком в ЛК Orange Data (Интеграция → Ключ для проверки подписи):\n");
console.log(publicPem);
console.log("=== Конец ключа ===");
console.log("\nИНН: 290124976119, ключ: 290124976119_40633");
console.log("ЛК: https://lk.orangedata.ru");
