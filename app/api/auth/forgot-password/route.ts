import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateVerificationCode } from "@/lib/auth";
import { sendPasswordResetCode } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

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
      // Не раскрываем, существует ли пользователь
      return NextResponse.json({
        success: true,
        message: "Если пользователь с таким email существует, код отправлен",
      });
    }

    // Генерация кода
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Сохранение кода (можно использовать ту же таблицу EmailVerification)
    await prisma.emailVerification.create({
      data: {
        email: user.email,
        code,
        expiresAt,
      },
    });

    // Отправка email
    await sendPasswordResetCode(user.email, code);

    return NextResponse.json({
      success: true,
      message: "Если пользователь с таким email существует, код отправлен",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при отправке кода" },
      { status: 500 }
    );
  }
}
