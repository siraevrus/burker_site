import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const markRead = searchParams.get("markRead") === "1";

    const session = await prisma.supportChatSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, email: true, firstName: true, phone: true } },
      },
    });
    if (!session) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    if (markRead && session.hasUnreadForAdmin) {
      await prisma.supportChatSession.update({
        where: { id },
        data: { hasUnreadForAdmin: false },
      });
    }

    const fresh = markRead && session.hasUnreadForAdmin
      ? { ...session, hasUnreadForAdmin: false }
      : session;

    return NextResponse.json({ session: fresh });
  } catch (e: unknown) {
    console.error("admin support session GET:", e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }
    const status =
      body &&
      typeof body === "object" &&
      (body as { status?: unknown }).status === "closed"
        ? "closed"
        : null;
    if (!status) {
      return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
    }

    const updated = await prisma.supportChatSession.update({
      where: { id },
      data: {
        status: "closed",
        closedAt: new Date(),
      },
    });

    return NextResponse.json({ session: updated });
  } catch (e: unknown) {
    console.error("admin support session PATCH:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
