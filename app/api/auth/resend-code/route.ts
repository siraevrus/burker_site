import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateVerificationCode } from "@/lib/auth";
import { sendVerificationCode } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Валидация
    if (!email) {
      return NextResponse.json(
        { error: "Email обязателен" },
        { status: 400 }
      );
    }

    // Проверка существования пользователя
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Если уже верифицирован
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email уже подтвержден" },
        { status: 400 }
      );
    }

    // Генерация нового кода
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Сохранение нового кода
    await prisma.emailVerification.create({
      data: {
        email: user.email,
        code,
        expiresAt,
      },
    });

    // Отправка email
    await sendVerificationCode(user.email, code);

    return NextResponse.json({
      success: true,
      message: "Код подтверждения отправлен на ваш email",
    });
  } catch (error: any) {
    console.error("Resend code error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при отправке кода" },
      { status: 500 }
    );
  }
}
