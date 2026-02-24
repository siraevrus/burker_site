import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/shipping/rates — публичный: таблица весов и цен для расчёта доставки.
 */
export async function GET() {
  try {
    const rows = await prisma.shippingRate.findMany({
      orderBy: { weightKg: "asc" },
    });
    const rates = rows.map((r) => ({ weight: r.weightKg, price: r.priceRub }));
    return NextResponse.json({ rates });
  } catch (error: unknown) {
    console.error("Shipping rates get error:", error);
    return NextResponse.json(
      { error: "Ошибка при получении тарифов" },
      { status: 500 }
    );
  }
}
