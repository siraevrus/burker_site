import { prisma } from "./db";
import { PromoBanner } from "./types";

export type { PromoBanner };

// Получить все промоблоки, отсортированные по order
export async function getPromoBanners(): Promise<PromoBanner[]> {
  const dbBanners = await prisma.promoBanner.findMany({
    orderBy: { order: "asc" },
  });
  return dbBanners.map((banner) => ({
    id: banner.id,
    image: banner.image,
    productLink: banner.productLink,
    title: banner.title || undefined,
    subtitle: banner.subtitle || undefined,
  }));
}

// Сохранить промоблоки
export async function savePromoBanners(
  banners: PromoBanner[]
): Promise<void> {
  // Удаляем все существующие баннеры
  await prisma.promoBanner.deleteMany();

  // Создаем новые баннеры
  await prisma.promoBanner.createMany({
    data: banners.map((banner, index) => ({
      id: banner.id,
      image: banner.image,
      productLink: banner.productLink,
      title: banner.title,
      subtitle: banner.subtitle,
      order: index,
    })),
  });
}
