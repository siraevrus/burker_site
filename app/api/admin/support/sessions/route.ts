import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const pageRaw = parseInt(searchParams.get("page") || "1", 10);
    const limitRaw = parseInt(searchParams.get("limit") || "30", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 30;
    const status = searchParams.get("status") || "all"; // open | closed | all
    const skip = (page - 1) * limit;

    const where =
      status === "open"
        ? { status: "open" as const }
        : status === "closed"
          ? { status: "closed" as const }
          : {};

    const [items, total] = await Promise.all([
      prisma.supportChatSession.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        skip,
        take: limit,
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          user: { select: { email: true, firstName: true } },
        },
      }),
      prisma.supportChatSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (e: unknown) {
    console.error("admin support sessions:", e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
