import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

const DEFAULTS = {
  title: "Вопрос-Ответ",
};

function isTableMissingError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /HomeFaq|HomeFaqItem|does not exist|no such table/i.test(msg);
}

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const [row, items] = await Promise.all([
      prisma.homeFaq.findUnique({ where: { id: "single" } }),
      prisma.homeFaqItem.findMany({ orderBy: { order: "asc" } }).catch(() => []),
    ]);
    return NextResponse.json({
      title: row?.title ?? DEFAULTS.title,
      items: items.map((i) => ({ id: i.id, question: i.question, answer: i.answer, order: i.order })),
    });
  } catch (error: unknown) {
    console.error("Get admin FAQ error:", error);
    if (isTableMissingError(error)) {
      return NextResponse.json({
        title: DEFAULTS.title,
        items: [],
      });
    }
    return NextResponse.json(
      { error: "Ошибка при получении блока Вопрос-Ответ" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const { title, items } = body;

    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const titleVal = str(title).trim() || DEFAULTS.title;

    await prisma.$transaction(async (tx) => {
      await tx.homeFaq.upsert({
        where: { id: "single" },
        update: { title: titleVal },
        create: { id: "single", title: titleVal },
      });

      if (Array.isArray(items)) {
        await tx.homeFaqItem.deleteMany({});
        let order = 0;
        for (const it of items) {
          const question = str(it?.question).trim();
          const answer = str(it?.answer).trim();
          if (!question && !answer) continue;
          await tx.homeFaqItem.create({
            data: { question: question || "Вопрос", answer, order: order++ },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Save admin FAQ error:", error);
    if (isTableMissingError(error)) {
      return NextResponse.json(
        {
          error:
            "Таблица HomeFaqItem не создана. На сервере выполните: npx prisma migrate deploy",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Ошибка при сохранении блока Вопрос-Ответ" },
      { status: 500 }
    );
  }
}
