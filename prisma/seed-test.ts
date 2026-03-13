/**
 * Скрипт засева тестовой БД демо-данными.
 * Запуск: npm run db:seed:test
 *
 * Что создаётся:
 * - Товары из lib/data (те же, что в основном seed)
 * - Промо-баннер
 * - Верхняя строка-бегущая строка
 * - Промо-коды TEST10, TEST20, FIXED500
 * - Настройки обменного курса
 * - Тестовый заказ (для проверки страниц заказа и PDF-чека)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { products } from "../lib/data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding TEST database...");

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promoCodeUsage.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.promoBanner.deleteMany();
  await prisma.topBanner.deleteMany();
  await prisma.exchangeRate.deleteMany();

  for (const product of products) {
    await prisma.product.create({
      data: {
        id: product.id,
        name: product.name,
        collection: product.collection,
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.discount,
        colors: JSON.stringify(product.colors),
        images: JSON.stringify(product.images),
        inStock: product.inStock,
        variant: product.variant,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
        description: product.description,
        specifications: product.specifications
          ? JSON.stringify(product.specifications)
          : null,
        relatedProducts: product.relatedProducts
          ? JSON.stringify(product.relatedProducts)
          : null,
      },
    });
  }
  console.log(`  ✓ ${products.length} товаров добавлено`);

  await prisma.promoBanner.create({
    data: {
      image: "/Isabell_gold_burgundy_1.webp",
      productLink: "/sale",
      title: "[TEST] DEMO SALE",
      subtitle: "ЧАСЫ • УКРАШЕНИЯ",
      order: 0,
    },
  });
  console.log("  ✓ Промо-баннер создан");

  await prisma.topBanner.upsert({
    where: { id: "single" },
    update: { text: "[ТЕСТ-СТЕНД] Это тестовая версия сайта" },
    create: {
      id: "single",
      text: "[ТЕСТ-СТЕНД] Это тестовая версия сайта",
    },
  });
  console.log("  ✓ Верхняя строка создана");

  const now = new Date();
  const yearLater = new Date(now);
  yearLater.setFullYear(yearLater.getFullYear() + 1);

  await prisma.promoCode.createMany({
    data: [
      {
        code: "TEST10",
        discountType: "percent",
        discount: 10,
        isActive: true,
        usageLimit: 9999,
        validFrom: now,
        validUntil: yearLater,
      },
      {
        code: "TEST20",
        discountType: "percent",
        discount: 20,
        isActive: true,
        usageLimit: 100,
        validFrom: now,
        validUntil: yearLater,
      },
      {
        code: "FIXED500",
        discountType: "fixed",
        discount: 500,
        isActive: true,
        usageLimit: 9999,
        validFrom: now,
        validUntil: yearLater,
      },
    ],
  });
  console.log("  ✓ Промо-коды: TEST10, TEST20, FIXED500");

  await prisma.exchangeRate.upsert({
    where: { id: "current" },
    update: { eurRate: 0.87, rubRate: 80.0 },
    create: { id: "current", eurRate: 0.87, rubRate: 80.0 },
  });
  console.log("  ✓ Курсы: EUR=0.87, RUB=80.0 (демо)");

  const firstProduct = products[0];
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: "TEST-00001",
      status: "accepted",
      paymentStatus: "paid",
      email: "test@example.com",
      firstName: "Тест",
      lastName: "Тестов",
      middleName: "Тестович",
      phone: "+7 (999) 000-00-00",
      cdekAddress: "г. Москва, ПВЗ Тестовый, ул. Примерная, д. 1",
      inn: "123456789012",
      passportSeries: "1234",
      passportNumber: "567890",
      passportIssueDate: "2020-01-01",
      passportIssuedBy: "ТЕСТ УФМС",
      totalAmount: firstProduct.price + 350,
      shippingCost: 350,
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: firstProduct.id,
            productName: firstProduct.name,
            productPrice: firstProduct.price,
            selectedColor: "black",
            quantity: 1,
          },
        ],
      },
    },
  });
  console.log(`  ✓ Тестовый заказ создан: ${testOrder.orderNumber}`);

  console.log("\n✅ TEST database seeded successfully!");
  console.log("\nТестовые промо-коды: TEST10 (-10%), TEST20 (-20%), FIXED500 (-500₽)");
  console.log("Тестовый заказ: TEST-00001");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
