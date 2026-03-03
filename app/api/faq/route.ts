import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULTS = {
  title: "Вопрос-Ответ",
  items: [] as Array<{ id: string; question: string; answer: string }>,
};

export async function GET() {
  try {
    const row = await prisma.homeFaq.findUnique({ where: { id: "single" } });
    const items = await prisma.homeFaqItem.findMany({ orderBy: { order: "asc" } }).catch(() => []);
    return NextResponse.json({
      title: row?.title ?? DEFAULTS.title,
      items: items.map((i) => ({ id: i.id, question: i.question, answer: i.answer })),
    });
  } catch (error: unknown) {
    console.error("Get home FAQ error:", error);
    return NextResponse.json(DEFAULTS);
  }
}
