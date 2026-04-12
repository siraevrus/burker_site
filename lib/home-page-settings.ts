import { prisma } from "@/lib/db";

const DEFAULT_BESTSELLERS_TITLE = "Бестселлеры";

/** Заголовок секции бестселлеров на главной (из админки). */
export async function getBestsellersSectionTitle(): Promise<string> {
  try {
    const row = await prisma.homePageSettings.findUnique({
      where: { id: "single" },
      select: { bestsellersTitle: true },
    });
    const t = row?.bestsellersTitle?.trim();
    if (t) return t;
  } catch {
    /* БД недоступна или таблицы ещё нет */
  }
  return DEFAULT_BESTSELLERS_TITLE;
}
