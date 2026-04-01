/**
 * Скрипт создания тестового пользователя для E2E тестов.
 *
 * Запуск:
 *   npx tsx scripts/create-test-user.ts
 *
 * Или через npm-скрипт (после добавления в package.json):
 *   npm run test:create-user
 *
 * Что делает:
 *   - Создаёт пользователя test@burker.ru / TestPassword123!
 *   - Если пользователь уже существует — обновляет пароль и сбрасывает emailVerified=true
 *   - Выводит итог в консоль
 *
 * Данные совпадают с константами в tests/e2e/auth.spec.ts и tests/e2e/checkout.spec.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_USER = {
  email: "test@burker.ru",
  password: "TestPassword123!",
  firstName: "Иван",
  lastName: "Иванов",
  middleName: "Иванович",
  phone: "79991234567",
};

async function main() {
  console.log("👤 Создание тестового пользователя...\n");

  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);

  const user = await prisma.user.upsert({
    where: { email: TEST_USER.email },
    update: {
      passwordHash,
      emailVerified: true,
      firstName: TEST_USER.firstName,
      lastName: TEST_USER.lastName,
      middleName: TEST_USER.middleName,
      phone: TEST_USER.phone,
    },
    create: {
      email: TEST_USER.email,
      passwordHash,
      emailVerified: true,
      firstName: TEST_USER.firstName,
      lastName: TEST_USER.lastName,
      middleName: TEST_USER.middleName,
      phone: TEST_USER.phone,
    },
  });

  console.log("✅ Тестовый пользователь готов:");
  console.log(`   ID:       ${user.id}`);
  console.log(`   Email:    ${user.email}`);
  console.log(`   Пароль:   ${TEST_USER.password}`);
  console.log(`   Имя:      ${user.firstName} ${user.lastName} ${user.middleName}`);
  console.log(`   Телефон:  +${user.phone}`);
  console.log(`   Верифицирован: ${user.emailVerified ? "да" : "нет"}`);
  console.log("\n🧪 Используйте эти данные в E2E тестах:");
  console.log(`   tests/e2e/auth.spec.ts     → TEST_USER.email / TEST_USER.password`);
  console.log(`   tests/e2e/checkout.spec.ts → TEST_ORDER.email`);
}

main()
  .catch((e) => {
    console.error("❌ Ошибка:", e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
