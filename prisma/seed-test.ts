/**
 * Скрипт засева тестовой БД демо-данными.
 * Запуск: npm run db:seed:test
 *
 * Что создаётся:
 * - Товары из lib/data (те же, что в основном seed)
 * - Промо-баннер
 * - Верхняя строка-бегущая строка
 * - Промо-коды TEST10 и TEST20
 * - Настройки обменного курса (евро)
 * - Тестовый заказ (для проверки страниц заказа и PDF-чека)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { products } from "../lib/data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding TEST database...");

  // Очистка существующих данных
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promoCodeUsage.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.promoBanner.deleteMany();
  await prisma.topBanner.deleteMany();
  await prisma.exchangeRate.deleteMany();

  // Товары
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

  // Промо-баннер
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

  // Верхняя строка
  await prisma.topBanner.upsert({
    where: { id: "single" },
    update: { text: "[ТЕСТ-СТЕНД] Это тестовая версия сайта" },
    create: {
      id: "single",
      text: "[ТЕСТ-СТЕНД] Это тестовая версия сайта",
    },
  });
  console.log("  ✓ Верхняя строка создана");

  // Промо-коды
  await prisma.promoCode.createMany({
    data: [
      {
        code: "TEST10",
        discountType: "percentage",
        discountValue: 10,
        isActive: true,
        usageLimit: null,
        usageCount: 0,
      },
      {
        code: "TEST20",
        discountType: "percentage",
        discountValue: 20,
        isActive: true,
        usageLimit: 100,
        usageCount: 0,
      },
      {
        code: "FIXED500",
        discountType: "fixed",
        discountValue: 500,
        isActive: true,
        usageLimit: null,
        usageCount: 0,
      },
    ],
  });
  console.log("  ✓ Промо-коды: TEST10, TEST20, FIXED500");

  // Курс обмена
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.exchangeRate.upsert({
    where: { currency: "EUR" },
    update: { rate: 100.0, date: today },
    create: { currency: "EUR", rate: 100.0, date: today },
  });
  console.log("  ✓ Курс EUR/RUB: 100.00 (демо)");

  // Тестовый заказ
  const firstProduct = products[0];
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: "TEST-00001",
      status: "paid",
      customerName: "Тест Тестов",
      customerEmail: "test@example.com",
      customerPhone: "+7 (999) 000-00-00",
      deliveryMethod: "cdek_courier",
      deliveryAddress: "г. Москва, ул. Тестовая, д. 1, кв. 1",
      deliveryCost: 350,
      subtotal: firstProduct.price * 100,
      total: firstProduct.price * 100 + 350,
      paymentMethod: "tbank_eacq",
      paymentId: "TEST_PAYMENT_ID_001",
      isPaid: true,
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: firstProduct.id,
            productName: firstProduct.name,
            productImage: firstProduct.images?.[0] ?? "",
            quantity: 1,
            price: firstProduct.price * 100,
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
