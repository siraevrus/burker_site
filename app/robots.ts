import type { MetadataRoute } from "next";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

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
    sitemap: `${CANONICAL_SITE_URL}/sitemap.xml`,
  };
}
