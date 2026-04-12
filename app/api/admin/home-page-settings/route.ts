import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

const MAX_TITLE = 120;

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const row = await prisma.homePageSettings.findUnique({
      where: { id: "single" },
    });
    return NextResponse.json({
      bestsellersTitle: row?.bestsellersTitle ?? "Бестселлеры",
    });
  } catch (e) {
    console.error("admin home-page-settings GET:", e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Некорректное тело" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const bestsellersTitle =
      typeof b.bestsellersTitle === "string" ? b.bestsellersTitle.trim() : "";

    if (!bestsellersTitle) {
      return NextResponse.json(
        { error: "Укажите заголовок блока" },
        { status: 400 }
      );
    }
    if (bestsellersTitle.length > MAX_TITLE) {
      return NextResponse.json(
        { error: `Заголовок не длиннее ${MAX_TITLE} символов` },
        { status: 400 }
      );
    }

    await prisma.homePageSettings.upsert({
      where: { id: "single" },
      create: {
        id: "single",
        bestsellersTitle,
      },
      update: { bestsellersTitle },
    });

    return NextResponse.json({ success: true, bestsellersTitle });
  } catch (e) {
    console.error("admin home-page-settings PUT:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
