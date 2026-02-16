import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, password } = body;

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 }
      );
    }

    // Поиск кода верификации
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
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
        { error: "Неверный или истекший код" },
        { status: 400 }
      );
    }

    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Хеширование нового пароля
    const passwordHash = await hashPassword(password);

    // Обновление пароля
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Отметка кода как использованного
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true },
    });

    return NextResponse.json({
      success: true,
      message: "Пароль успешно изменен",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при сбросе пароля" },
      { status: 500 }
    );
  }
}
