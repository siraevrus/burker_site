import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

/**
 * GET /api/admin/seo — список всех SEO-записей (только для админа).
 */
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const list = await prisma.seoPage.findMany({
      orderBy: { path: "asc" },
    });
    return NextResponse.json({ seo: list });
  } catch (error: unknown) {
    console.error("Admin SEO list error:", error);
    return NextResponse.json(
      { error: "Ошибка при загрузке SEO" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/seo — создать или обновить SEO по path (только для админа).
 * Body: { path: string, title: string, description?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const path = typeof body.path === "string" ? body.path.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    if (!path) {
      return NextResponse.json(
        { error: "Укажите path страницы" },
        { status: 400 }
      );
    }
    if (!title) {
      return NextResponse.json(
        { error: "Укажите title" },
        { status: 400 }
      );
    }

    const normalized = path === "/" ? "/" : path.replace(/\/+$/, "") || "/";

    const row = await prisma.seoPage.upsert({
      where: { path: normalized },
      create: {
        path: normalized,
        title,
        description: description || undefined,
      },
      update: {
        title,
        description: description ?? undefined,
      },
    });
    return NextResponse.json({ seo: row });
  } catch (error: unknown) {
    console.error("Admin SEO upsert error:", error);
    return NextResponse.json(
      { error: "Ошибка при сохранении SEO" },
      { status: 500 }
    );
  }
}
