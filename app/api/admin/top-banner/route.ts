import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const banner = await prisma.topBanner.findUnique({
      where: { id: "single" },
    });
    return NextResponse.json({ text: banner?.text || "" });
  } catch (error: any) {
    console.error("Get top banner error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении текста" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (typeof text !== "string") {
      return NextResponse.json(
        { error: "Текст обязателен" },
        { status: 400 }
      );
    }

    if (text.length > 200) {
      return NextResponse.json(
        { error: "Текст не должен превышать 200 символов" },
        { status: 400 }
      );
    }

    await prisma.topBanner.upsert({
      where: { id: "single" },
      update: { text },
      create: {
        id: "single",
        text,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save top banner error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при сохранении текста" },
      { status: 500 }
    );
  }
}
