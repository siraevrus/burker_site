import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const processed = searchParams.get("processed"); // "true" | "false" | all
    const skip = (page - 1) * limit;

    const where: { processed?: boolean } = {};
    if (processed === "true") where.processed = true;
    if (processed === "false") where.processed = false;

    const [items, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    return NextResponse.json({
      feedback: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Admin feedback list error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при загрузке" },
      { status: 500 }
    );
  }
}
