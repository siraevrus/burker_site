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

    const currentUser = await getCurrentUser();
    const providedToken = request.nextUrl.searchParams.get("token") || "";

    // Правила доступа:
    // 1. Авторизованный владелец заказа — всегда разрешено
    // 2. Гостевой заказ (без userId) + валидный токен — разрешено
    // 3. Всё остальное — запрещено (в т.ч. чужой токен при наличии userId у заказа)
    const isOwner =
      currentUser != null &&
      order.userId != null &&
      order.userId === currentUser.userId;

    const isGuestWithToken =
      order.userId == null &&
      order.accessToken != null &&
      providedToken.length > 0 &&
      order.accessToken === providedToken;

    if (!isOwner && !isGuestWithToken) {
      return NextResponse.json(
        { error: "Доступ запрещен" },
        { status: 403 }
      );
    }

    const { accessToken: _t, ...orderSafe } = order;
    return NextResponse.json({ order: orderSafe });
  } catch (error: any) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении заказа" },
      { status: 500 }
    );
  }
}
