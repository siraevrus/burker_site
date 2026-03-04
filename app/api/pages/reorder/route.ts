import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { pageIds } = body;

    if (!Array.isArray(pageIds)) {
      return NextResponse.json(
        { error: "Необходимо передать массив ID страниц" },
        { status: 400 }
      );
    }

    // Обновляем порядок для каждой страницы
    const updates = pageIds.map((pageId: string, index: number) =>
      prisma.page.update({
        where: { id: pageId },
        data: { order: index },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reordering pages:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении порядка страниц" },
      { status: 500 }
    );
  }
}
