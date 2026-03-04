import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";

// Роут оставлен для совместимости с админкой. Сортировка страниц отключена.
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const { pageIds } = body;

  if (!Array.isArray(pageIds)) {
    return NextResponse.json(
      { error: "Необходимо передать массив ID страниц" },
      { status: 400 }
    );
  }

  // Ничего не делаем — поле order удалено из модели Page
  return NextResponse.json({ success: true });
}
