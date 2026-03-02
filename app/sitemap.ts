import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { generateProductSlug } from "@/lib/products";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

/** Регенерация sitemap раз в сутки */
export const revalidate = 86400; // 24 часа

const collectionSlugs = [
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
  const BASE_URL = CANONICAL_SITE_URL;

  // Статические страницы: без /cart, без дублей /collections/watches и /collections/jewelry (они в collectionSlugs)
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/sale`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const collectionRoutes: MetadataRoute.Sitemap = collectionSlugs.map((slug) => ({
    url: `${BASE_URL}/collections/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const products = await prisma.product.findMany({
    where: { disabled: { not: true }, soldOut: false },
    select: { name: true, updatedAt: true },
  });

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/product/${generateProductSlug(p.name)}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...collectionRoutes, ...productRoutes];
}
