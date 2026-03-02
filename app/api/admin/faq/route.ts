import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

const DEFAULTS = {
  title: "Вопрос-Ответ",
  content: "",
};

function isTableMissingError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /HomeFaq|does not exist|no such table/i.test(msg);
}

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const row = await prisma.homeFaq.findUnique({
      where: { id: "single" },
    });
    return NextResponse.json({
      title: row?.title ?? DEFAULTS.title,
      content: row?.content ?? DEFAULTS.content,
    });
  } catch (error: unknown) {
    console.error("Get home FAQ error:", error);
    if (isTableMissingError(error)) {
      return NextResponse.json({
        title: DEFAULTS.title,
        content: DEFAULTS.content,
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
    const { title, content } = body;

    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const titleVal = str(title).trim() || DEFAULTS.title;
    const contentVal = str(content);

    await prisma.homeFaq.upsert({
      where: { id: "single" },
      update: { title: titleVal, content: contentVal },
      create: { id: "single", title: titleVal, content: contentVal },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Save home FAQ error:", error);
    if (isTableMissingError(error)) {
      return NextResponse.json(
        {
          error:
            "Таблица HomeFaq не создана. На сервере выполните: npx prisma migrate deploy",
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
