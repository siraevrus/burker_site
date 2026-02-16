import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден" },
        { status: 404 }
      );
    }

    // Проверка доступа: пользователь может видеть только свои заказы
    const currentUser = await getCurrentUser();
    if (currentUser && order.userId && order.userId !== currentUser.userId) {
      return NextResponse.json(
        { error: "Доступ запрещен" },
        { status: 403 }
      );
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении заказа" },
      { status: 500 }
    );
  }
}
