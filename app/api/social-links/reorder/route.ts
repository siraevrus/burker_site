import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { linkIds } = body;

    if (!Array.isArray(linkIds)) {
      return NextResponse.json(
        { error: "Необходимо передать массив ID ссылок" },
        { status: 400 }
      );
    }

    // Обновляем порядок для каждой ссылки
    const updates = linkIds.map((linkId: string, index: number) =>
      prisma.socialLink.update({
        where: { id: linkId },
        data: { order: index },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reordering social links:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении порядка ссылок" },
      { status: 500 }
    );
  }
}
