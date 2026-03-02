#!/usr/bin/env tsx
/**
 * Генерация bcrypt-хеша для ADMIN_PASSWORD_HASH.
 * Использование: npx tsx scripts/generate-admin-hash.ts "ваш_пароль"
 * Затем добавьте в .env.production: ADMIN_PASSWORD_HASH=<вывод>
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npx tsx scripts/generate-admin-hash.ts \"your_password\"");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
