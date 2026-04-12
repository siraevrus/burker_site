import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { generateProductPath } from "@/lib/utils";
import { getCatalogMaps } from "@/lib/catalog-lines";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

/**
 * Генерация sitemap.xml для поисковиков.
 * Все URL только на основном домене без www (burker-watches.ru).
 * Регенерация раз в сутки.
 */
export const revalidate = 86400; // 24 часа

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = CANONICAL_SITE_URL.replace(/\/+$/, "");
  const maps = await getCatalogMaps();

  const [watchLines, jewelryLines] = await Promise.all([
    prisma.catalogLine.findMany({
      where: { kind: "watches", enabled: true },
      select: { slug: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.catalogLine.findMany({
      where: { kind: "jewelry", enabled: true },
      select: { slug: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const CATEGORY_PAGES = [
    { url: "watches" as const, subcategories: watchLines.map((l) => l.slug) },
    { url: "jewelry" as const, subcategories: jewelryLines.map((l) => l.slug) },
  ];

  // ——— Главная ———
  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  };

  // ——— Статические страницы (без /cart) ———
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/sale`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
  ];

  // ——— Категории и подкатегории /products/[category] и /products/[category]/[subcategory] ———
  const collectionEntries: MetadataRoute.Sitemap = [];
  for (const cat of CATEGORY_PAGES) {
    collectionEntries.push({
      url: `${BASE_URL}/products/${cat.url}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    });
    for (const sub of cat.subcategories) {
      collectionEntries.push({
        url: `${BASE_URL}/products/${cat.url}/${sub}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.9,
      });
    }
  }

  // ——— Товары из Prisma (только с subcategory) ———
  const products = await prisma.product.findMany({
    where: {
      disabled: { not: true },
      soldOut: false,
      subcategory: { not: null },
    },
    select: {
      name: true,
      collection: true,
      subcategory: true,
      updatedAt: true,
    },
  });

  const productEntries: MetadataRoute.Sitemap = products
    .filter((p) => p.subcategory)
    .map((p) => {
      const path = generateProductPath(
        {
          name: p.name,
          collection: p.collection,
          subcategory: p.subcategory,
        },
        maps
      );
      return path
        ? {
            url: `${BASE_URL}${path}`,
            lastModified: p.updatedAt,
            changeFrequency: "daily" as const,
            priority: 0.8,
          }
        : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return [homeEntry, ...staticEntries, ...collectionEntries, ...productEntries];
}
