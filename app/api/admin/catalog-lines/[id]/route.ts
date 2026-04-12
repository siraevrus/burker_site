import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { revalidateCatalogLinesCache } from "@/lib/catalog-lines";
import { isCatalogSlugEditable } from "@/lib/catalog-line-policy";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validSlug(s: string): boolean {
  return s.length > 0 && s.length <= 120 && SLUG_RE.test(s);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const existing = await prisma.catalogLine.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

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

    const data: {
      sortOrder?: number;
      enabled?: boolean;
      showOnHome?: boolean;
      slug?: string;
      publishedAt?: Date;
    } = {};

    if (typeof b.sortOrder === "number" && Number.isFinite(b.sortOrder)) {
      data.sortOrder = b.sortOrder;
    }
    if (typeof b.enabled === "boolean") data.enabled = b.enabled;
    if (typeof b.showOnHome === "boolean") data.showOnHome = b.showOnHome;

    if (b.slug !== undefined) {
      if (!isCatalogSlugEditable(existing.publishedAt)) {
        return NextResponse.json(
          { error: "Slug нельзя менять после публикации линии" },
          { status: 400 }
        );
      }
      const slugRaw =
        typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
      if (!validSlug(slugRaw)) {
        return NextResponse.json(
          { error: "Некорректный slug" },
          { status: 400 }
        );
      }
      data.slug = slugRaw;
    }

    if (b.publish === true && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ line: existing });
    }

    const updated = await prisma.catalogLine.update({
      where: { id },
      data,
    });
    revalidateCatalogLinesCache();
    return NextResponse.json({ line: updated });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Такой slug уже занят" }, { status: 409 });
    }
    console.error("admin catalog-lines PATCH:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await prisma.catalogLine.delete({ where: { id } });
    revalidateCatalogLinesCache();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    console.error("admin catalog-lines DELETE:", e);
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}
