import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { generateProductSlug } from "@/lib/products";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

/**
 * Генерация sitemap.xml для поисковиков.
 * Все URL только на основном домене без www (burker-watches.ru).
 * Регенерация раз в сутки.
 */
export const revalidate = 86400; // 24 часа

/** Список slug коллекций для URL /collections/[slug]. Дубли (watches, jewelry) не повторяем. */
const COLLECTION_SLUGS = [
  "watches",
  "jewelry",
  "diana",
  "sophie",
  "olivia",
  "macy",
  "isabell",
  "julia",
  "ruby",
  "olivia-petite",
  "macy-petite",
  "isabell-petite",
  "ruby-petite",
  "bracelets",
  "necklaces",
  "earrings",
  "rings",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = CANONICAL_SITE_URL.replace(/\/+$/, "");

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

  // ——— Коллекции: каждая по одному разу (без дублей watches/jewelry) ———
  // Если появится модель Collection в Prisma с полем slug и noindex — заменить на выборку из БД.
  const collectionEntries: MetadataRoute.Sitemap = COLLECTION_SLUGS.map((slug) => ({
    url: `${BASE_URL}/collections/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // ——— Товары из Prisma ———
  // Условие: не отключён, не распродан. Когда в схему добавят noindex — добавить в where: { noindex: false }.
  const products = await prisma.product.findMany({
    where: {
      disabled: { not: true },
      soldOut: false,
    },
    select: {
      name: true,
      updatedAt: true,
      // Когда в Product добавят seoCanonicalUrl — добавить в select и ниже использовать, если заполнено.
    },
  });

  const productEntries: MetadataRoute.Sitemap = products.map((p) => {
    const slug = generateProductSlug(p.name);
    return {
      url: `${BASE_URL}/product/${slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    };
  });

  // Собираем все URL в один массив (каждый адрес один раз).
  return [homeEntry, ...staticEntries, ...collectionEntries, ...productEntries];
}
