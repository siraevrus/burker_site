import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

const DEFAULTS = {
  customerServiceTitle: "Обслуживание клиентов",
  policiesTitle: "Политики",
  socialTitle: "Социальные сети",
};

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const row = await prisma.footerSettings.findUnique({
      where: { id: "single" },
    });
    return NextResponse.json({
      customerServiceTitle: row?.customerServiceTitle ?? DEFAULTS.customerServiceTitle,
      policiesTitle: row?.policiesTitle ?? DEFAULTS.policiesTitle,
      socialTitle: row?.socialTitle ?? DEFAULTS.socialTitle,
    });
  } catch (error: unknown) {
    console.error("Get footer settings error:", error);
    return NextResponse.json(
      { error: "Ошибка при получении настроек футера" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const {
      customerServiceTitle,
      policiesTitle,
      socialTitle,
    } = body;

    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const t1 = str(customerServiceTitle).trim() || DEFAULTS.customerServiceTitle;
    const t2 = str(policiesTitle).trim() || DEFAULTS.policiesTitle;
    const t3 = str(socialTitle).trim() || DEFAULTS.socialTitle;

    await prisma.footerSettings.upsert({
      where: { id: "single" },
      update: {
        customerServiceTitle: t1,
        policiesTitle: t2,
        socialTitle: t3,
      },
      create: {
        id: "single",
        customerServiceTitle: t1,
        policiesTitle: t2,
        socialTitle: t3,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Save footer settings error:", error);
    return NextResponse.json(
      { error: "Ошибка при сохранении настроек футера" },
      { status: 500 }
    );
  }
}
