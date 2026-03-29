import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id: sessionId } = await context.params;
    const session = await prisma.supportChatSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
    }
    if (session.status !== "open") {
      return NextResponse.json({ error: "Чат закрыт" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }
    const text =
      body &&
      typeof body === "object" &&
      typeof (body as { text?: unknown }).text === "string"
        ? (body as { text: string }).text.trim()
        : "";
    if (!text) {
      return NextResponse.json({ error: "Введите сообщение" }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: "Слишком длинное сообщение" }, { status: 400 });
    }

    const msg = await prisma.supportChatMessage.create({
      data: {
        id: randomUUID(),
        sessionId,
        role: "admin",
        body: text,
      },
    });

    await prisma.supportChatSession.update({
      where: { id: sessionId },
      data: { lastMessageAt: new Date(), hasUnreadForAdmin: false },
    });

    return NextResponse.json({ message: msg });
  } catch (e: unknown) {
    console.error("admin support message POST:", e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
