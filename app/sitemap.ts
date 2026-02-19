import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.burker-watches.ru";

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
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/sale`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/cart`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/collections/watches`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/collections/jewelry`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
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
    where: { disabled: { not: true } },
    select: { bodyId: true, id: true, updatedAt: true },
  });

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/product/${p.bodyId || p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...collectionRoutes, ...productRoutes];
}
