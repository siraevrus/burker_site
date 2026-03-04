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
    // Используем динамическое обновление для совместимости со старым Prisma Client
    const updates = pageIds.map((pageId: string, index: number) => {
      const data: any = { order: index };
      return prisma.page.update({
        where: { id: pageId },
        data,
      });
    });

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reordering pages:", error);
    
    // Если ошибка связана с отсутствием поля order, возвращаем успех
    // (порядок будет сохранен после обновления Prisma Client)
    if (error.message && error.message.includes("order")) {
      console.warn("Поле 'order' не найдено в Prisma Client. Необходимо обновить Prisma Client.");
      return NextResponse.json(
        { 
          success: false, 
          error: "Поле 'order' не найдено. Необходимо обновить Prisma Client на сервере.",
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении порядка страниц" },
      { status: 500 }
    );
  }
}
