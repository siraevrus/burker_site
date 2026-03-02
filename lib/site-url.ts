/**
 * Канонический домен сайта — без www.
 * Используется для canonical, sitemap, robots, редиректов.
 */
export const CANONICAL_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://burker-watches.ru";

/** Нормализованный хост канонического URL (без протокола и слеша) */
export const CANONICAL_HOST = "burker-watches.ru";

/** Строит канонический URL для заданного пути (SSR, для metadata.alternates) */
export function getCanonicalUrl(path: string): string {
  const base = CANONICAL_SITE_URL.replace(/\/+$/, "");
  return path === "/" ? base : `${base}${path}`;
}
