import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/seo?path=/contact
 * Возвращает title и description для указанного path (публичный).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    if (!path || path === "") {
      return NextResponse.json({ title: null, description: null });
    }
    const normalized = path === "/" ? "/" : path.replace(/\/+$/, "") || "/";
    const row = await prisma.seoPage.findUnique({
      where: { path: normalized },
    });
    if (!row) {
      return NextResponse.json({ title: null, description: null });
    }
    return NextResponse.json({
      title: row.title,
      description: row.description ?? null,
    });
  } catch (error: unknown) {
    console.error("SEO get error:", error);
    return NextResponse.json(
      { error: "Ошибка при получении SEO" },
      { status: 500 }
    );
  }
}
