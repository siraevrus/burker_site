import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { parseScheduleJson } from "@/lib/support-schedule";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const row = await prisma.supportWidgetSettings.findUnique({ where: { id: "single" } });
    if (!row) {
      const created = await prisma.supportWidgetSettings.create({
        data: {
          id: "single",
          offlineMessage: "Мы ответим в ближайшее рабочее время.",
          welcomeTitle: "Поддержка",
        },
      });
      return NextResponse.json({ settings: created });
    }
    return NextResponse.json({ settings: row });
  } catch (e: unknown) {
    console.error("admin support settings GET:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Таблица не найдена в БД. Для SQLite укажите DATABASE_URL=file:./dev.db (путь относительно каталога prisma/).",
        },
        { status: 500 }
      );
    }
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
      return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const enabled = typeof b.enabled === "boolean" ? b.enabled : undefined;
    const timezone = typeof b.timezone === "string" ? b.timezone.trim() : undefined;
    const scheduleJson =
      typeof b.scheduleJson === "string" ? b.scheduleJson : undefined;
    const offlineMessage =
      typeof b.offlineMessage === "string" ? b.offlineMessage.trim() : undefined;
    const welcomeTitle =
      typeof b.welcomeTitle === "string" ? b.welcomeTitle.trim() : undefined;
    const telegramNotifyOn =
      b.telegramNotifyOn === "first_message_only" || b.telegramNotifyOn === "every_visitor"
        ? b.telegramNotifyOn
        : undefined;

    if (scheduleJson !== undefined) {
      if (scheduleJson.length > 32_000) {
        return NextResponse.json({ error: "scheduleJson слишком длинный" }, { status: 400 });
      }
      parseScheduleJson(scheduleJson);
    }
    if (timezone !== undefined && timezone.length > 120) {
      return NextResponse.json({ error: "Некорректный часовой пояс" }, { status: 400 });
    }
    if (welcomeTitle !== undefined && welcomeTitle.length > 200) {
      return NextResponse.json({ error: "Заголовок слишком длинный" }, { status: 400 });
    }
    if (offlineMessage !== undefined && offlineMessage.length > 2000) {
      return NextResponse.json({ error: "Текст слишком длинный" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (timezone !== undefined && timezone.length) data.timezone = timezone;
    if (scheduleJson !== undefined) data.scheduleJson = scheduleJson;
    if (offlineMessage !== undefined) data.offlineMessage = offlineMessage;
    if (welcomeTitle !== undefined) data.welcomeTitle = welcomeTitle;
    if (telegramNotifyOn !== undefined) data.telegramNotifyOn = telegramNotifyOn;

    const updated = await prisma.supportWidgetSettings.upsert({
      where: { id: "single" },
      create: {
        id: "single",
        enabled: (enabled as boolean) ?? true,
        timezone: timezone || "Europe/Moscow",
        scheduleJson: scheduleJson ?? "[]",
        offlineMessage: offlineMessage ?? "Мы ответим в ближайшее рабочее время.",
        welcomeTitle: welcomeTitle ?? "Поддержка",
        telegramNotifyOn: telegramNotifyOn ?? "every_visitor",
      },
      update: data,
    });

    return NextResponse.json({ settings: updated });
  } catch (e: unknown) {
    console.error("admin support settings PUT:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
