import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contact, comment, agreePd } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Укажите имя" },
        { status: 400 }
      );
    }
    if (!contact?.trim()) {
      return NextResponse.json(
        { error: "Укажите контакт для связи (Телеграм или телефон)" },
        { status: 400 }
      );
    }
    if (!comment?.trim()) {
      return NextResponse.json(
        { error: "Напишите комментарий" },
        { status: 400 }
      );
    }
    if (!agreePd) {
      return NextResponse.json(
        { error: "Необходимо согласие на обработку персональных данных" },
        { status: 400 }
      );
    }

    await prisma.feedback.create({
      data: {
        name: name.trim(),
        contact: contact.trim(),
        comment: comment.trim(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback create error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при отправке" },
      { status: 500 }
    );
  }
}
