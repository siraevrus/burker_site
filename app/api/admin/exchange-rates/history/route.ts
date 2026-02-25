import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/db";

/**
 * GET — история парсинга курсов валют (последние записи)
 * Query: limit (default 50), offset (default 0)
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10)), 200);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const [items, total] = await Promise.all([
      prisma.exchangeRateHistory.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.exchangeRateHistory.count(),
    ]);

    return NextResponse.json({
      items: items.map((r) => ({
        id: r.id,
        eurRate: r.eurRate,
        rubRate: r.rubRate,
        rubPerEur: r.rubRate / r.eurRate,
        source: r.source,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching exchange rate history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
