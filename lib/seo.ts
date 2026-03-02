import { prisma } from "@/lib/db";

const DEFAULT_SUFFIX = " | Mira Brands | Burker";

function normalizePath(path: string): string {
  return path === "/" ? "/" : path.replace(/\/+$/, "") || "/";
}

/**
 * Возвращает title и description для страницы из раздела SEO админки.
 * Используется в generateMetadata на страницах сайта.
 */
export async function getSeoForPath(path: string): Promise<{
  title: string | null;
  description: string | null;
}> {
  const normalized = normalizePath(path);
  const row = await prisma.seoPage.findUnique({
    where: { path: normalized },
  });
  if (!row) return { title: null, description: null };
  return {
    title: row.title || null,
    description: row.description ?? null,
  };
}

/**
 * Формирует объект Metadata для Next.js: title и description.
 * Если в админке нет записи для path, подставляются fallback-значения.
 */
export async function getMetadataForPath(
  path: string,
  fallback: { title: string; description: string }
): Promise<{ title: string; description: string }> {
  const seo = await getSeoForPath(path);
  return {
    title: seo.title?.trim() || fallback.title,
    description: seo.description?.trim() || fallback.description,
  };
}
