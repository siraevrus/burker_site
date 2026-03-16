import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendFeedbackNotificationToAdmin } from "@/lib/email";
import { notifyFeedback } from "@/lib/telegram";

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

    const created = await prisma.feedback.create({
      data: {
        name: name.trim(),
        contact: contact.trim(),
        comment: comment.trim(),
      },
    });

    // Уведомление администратору (email + Telegram, не блокируем ответ при ошибке)
    sendFeedbackNotificationToAdmin({
      name: created.name,
      contact: created.contact,
      comment: created.comment,
    }).catch((err) => console.error("Feedback notification to admin:", err));

    notifyFeedback({
      name: created.name,
      contact: created.contact,
      comment: created.comment,
    }).catch((err) => console.error("Feedback Telegram notification:", err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback create error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при отправке" },
      { status: 500 }
    );
  }
}
