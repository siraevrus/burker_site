/**
 * Скрипт для миграции старых путей промо-изображений
 * Запустить: tsx scripts/migrate-promo-paths.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migratePromoPaths() {
  try {
    console.log("Начинаем миграцию путей промо-изображений...");

    const banners = await prisma.promoBanner.findMany();

    let updated = 0;
    for (const banner of banners) {
      let needsUpdate = false;
      const updates: { image?: string; imageMobile?: string } = {};

      // Обновляем основное изображение
      if (banner.image && banner.image.startsWith("/promo/")) {
        const filename = banner.image.replace("/promo/", "");
        updates.image = `/api/promo-images/${filename}`;
        needsUpdate = true;
      }

      // Обновляем мобильное изображение
      if (banner.imageMobile && banner.imageMobile.startsWith("/promo/")) {
        const filename = banner.imageMobile.replace("/promo/", "");
        updates.imageMobile = `/api/promo-images/${filename}`;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.promoBanner.update({
          where: { id: banner.id },
          data: updates,
        });
        updated++;
        console.log(`Обновлен баннер ${banner.id}`);
      }
    }

    console.log(`Миграция завершена. Обновлено баннеров: ${updated}`);
  } catch (error) {
    console.error("Ошибка при миграции:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePromoPaths();
