import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.burker-watches.ru";

/** Регенерация robots.txt раз в сутки */
export const revalidate = 86400; // 24 часа

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
