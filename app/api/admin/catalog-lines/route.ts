import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { revalidateCatalogLinesCache } from "@/lib/catalog-lines";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validSlug(s: string): boolean {
  return s.length > 0 && s.length <= 120 && SLUG_RE.test(s);
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const lines = await prisma.catalogLine.findMany({
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ lines });
  } catch (e) {
    console.error("admin catalog-lines GET:", e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const kind = typeof b.kind === "string" ? b.kind.trim() : "";
    const subcategory = typeof b.subcategory === "string" ? b.subcategory.trim() : "";
    const slugRaw = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
    const sortOrder = typeof b.sortOrder === "number" && Number.isFinite(b.sortOrder) ? b.sortOrder : 0;
    const enabled = typeof b.enabled === "boolean" ? b.enabled : true;
    const showOnHome = typeof b.showOnHome === "boolean" ? b.showOnHome : false;
    const publish = typeof b.publish === "boolean" ? b.publish : false;

    if (kind !== "watches" && kind !== "jewelry") {
      return NextResponse.json({ error: "kind: watches или jewelry" }, { status: 400 });
    }
    if (!subcategory) {
      return NextResponse.json({ error: "Укажите subcategory" }, { status: 400 });
    }
    if (!validSlug(slugRaw)) {
      return NextResponse.json(
        { error: "slug: латиница, цифры и дефисы (напр. macy-petite)" },
        { status: 400 }
      );
    }

    const created = await prisma.catalogLine.create({
      data: {
        kind,
        subcategory,
        slug: slugRaw,
        sortOrder,
        enabled,
        showOnHome,
        publishedAt: publish ? new Date() : null,
      },
    });
    revalidateCatalogLinesCache();
    return NextResponse.json({ line: created });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Линия с таким subcategory или slug уже есть" },
        { status: 409 }
      );
    }
    console.error("admin catalog-lines POST:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
