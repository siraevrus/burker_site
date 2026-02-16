import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * API endpoint для получения последнего кода верификации (только для разработки)
 */
export async function GET(request: NextRequest) {
  // Только в режиме разработки
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email обязателен" },
        { status: 400 }
      );
    }

    // Получаем последний неиспользованный код верификации
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: email.toLowerCase(),
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Код не найден или истек" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: verification.code,
      expiresAt: verification.expiresAt,
      createdAt: verification.createdAt,
    });
  } catch (error: any) {
    console.error("Get verification code error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении кода" },
      { status: 500 }
    );
  }
}
