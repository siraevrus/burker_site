import { prisma } from "./db";

// Получить текст верхней строки
export async function getTopBannerText(): Promise<string> {
  const banner = await prisma.topBanner.findUnique({
    where: { id: "single" },
  });
  return banner?.text || "";
}

// Сохранить текст верхней строки
export async function saveTopBannerText(text: string): Promise<void> {
  await prisma.topBanner.upsert({
    where: { id: "single" },
    update: { text },
    create: {
      id: "single",
      text,
    },
  });
}
