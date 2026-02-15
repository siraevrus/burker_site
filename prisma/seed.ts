import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { products } from "../lib/data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Очистка существующих данных
  await prisma.product.deleteMany();
  await prisma.promoBanner.deleteMany();
  await prisma.topBanner.deleteMany();

  // Добавление товаров
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

  // Добавление начального промоблока
  await prisma.promoBanner.create({
    data: {
      image: "/Isabell_gold_burgundy_1.webp",
      productLink: "/sale",
      title: "VALENTINE'S SALE",
      subtitle: "ЧАСЫ • УКРАШЕНИЯ",
      order: 0,
    },
  });

  // Добавление начального текста верхней строки
  await prisma.topBanner.upsert({
    where: { id: "single" },
    update: {},
    create: {
      id: "single",
      text: "",
    },
  });

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
