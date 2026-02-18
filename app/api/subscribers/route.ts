import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - получить всех подписчиков
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.subscriber.count(),
    ]);

    return NextResponse.json({
      subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get subscribers error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении подписчиков" },
      { status: 500 }
    );
  }
}

// POST - создать нового подписчика
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email обязателен" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Проверяем, существует ли уже такой подписчик
    const existing = await prisma.subscriber.findUnique({
      where: { email: emailLower },
    });

    if (existing) {
      return NextResponse.json(
        { success: true, message: "Вы уже подписаны на рассылку", subscriber: existing },
        { status: 200 }
      );
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        email: emailLower,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Вы успешно подписались на рассылку",
      subscriber,
    });
  } catch (error: any) {
    console.error("Create subscriber error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при подписке на рассылку" },
      { status: 500 }
    );
  }
}

// DELETE - удалить подписчика
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Не указан ID подписчика" },
        { status: 400 }
      );
    }

    await prisma.subscriber.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete subscriber error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при удалении подписчика" },
      { status: 500 }
    );
  }
}
