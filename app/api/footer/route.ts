import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULTS = {
  customerServiceTitle: "Обслуживание клиентов",
  policiesTitle: "Политики",
  socialTitle: "Социальные сети",
};

export async function GET() {
  try {
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
    return NextResponse.json(DEFAULTS);
  }
}
