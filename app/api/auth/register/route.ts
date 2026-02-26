import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, generateVerificationCode } from "@/lib/auth";
import { sendVerificationCode } from "@/lib/email";
import { notifyNewRegistration } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName } = body;

    // Валидация
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 }
      );
    }

    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    // Хеширование пароля
    const passwordHash = await hashPassword(password);

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        emailVerified: false,
      },
    });

    // Генерация кода верификации
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Сохранение кода верификации
    await prisma.emailVerification.create({
      data: {
        email: user.email,
        code,
        expiresAt,
      },
    });

    // Отправка email с кодом
    await sendVerificationCode(user.email, code);

    await notifyNewRegistration({ email: user.email, firstName: user.firstName });

    return NextResponse.json({
      success: true,
      message: "Код подтверждения отправлен на ваш email",
      userId: user.id,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при регистрации" },
      { status: 500 }
    );
  }
}
