import type { MetadataRoute } from "next";
import { CANONICAL_HOST, CANONICAL_SITE_URL } from "@/lib/site-url";

/** Регенерация robots.txt раз в сутки */
export const revalidate = 86400; // 24 часа

/**
 * Итоговый URL: https://burker-watches.ru/robots.txt
 *
 * Закрыто от индексации: служебные API, админка, корзина, оформление, ЛК, заказы,
 * восстановление пароля и типичный query-мусор (do=, sectok=).
 * Каталог, товары, акции, статические страницы — открыты (Allow: /).
 */
export default function robots(): MetadataRoute.Robots {
  const base = CANONICAL_SITE_URL.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/cart",
          "/checkout",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/profile",
          "/orders",
          "/order/",
          "/order-confirmation",
          // Выдача поиска по сайту — обычно не нужна в индексе (дубли и «пустые» SERP)
          "/search",
          "/*?*do=",
          "/*?*sectok=",
        ],
      },
    ],
    host: CANONICAL_HOST,
    sitemap: `${base}/sitemap.xml`,
  };
}
