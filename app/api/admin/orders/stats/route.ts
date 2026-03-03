import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    // Получаем статистику по статусам заказов
    const stats = await prisma.order.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    // Преобразуем в удобный формат
    const statusStats: Record<string, number> = {
      accepted: 0,
      purchased: 0,
      in_transit_de: 0,
      in_transit_ru: 0,
      delivered: 0,
      cancelled: 0,
    };

    stats.forEach((stat) => {
      if (stat.status in statusStats) {
        statusStats[stat.status] = stat._count.id;
      }
    });

    return NextResponse.json({
      stats: statusStats,
    });
  } catch (error: any) {
    console.error("Get order stats error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении статистики" },
      { status: 500 }
    );
  }
}
