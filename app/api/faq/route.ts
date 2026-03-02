import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULTS = {
  title: "Вопрос-Ответ",
  content: "",
};

export async function GET() {
  try {
    const row = await prisma.homeFaq.findUnique({
      where: { id: "single" },
    });
    return NextResponse.json({
      title: row?.title ?? DEFAULTS.title,
      content: row?.content ?? DEFAULTS.content,
    });
  } catch (error: unknown) {
    console.error("Get home FAQ error:", error);
    return NextResponse.json(DEFAULTS);
  }
}
