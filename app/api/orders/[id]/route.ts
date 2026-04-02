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

    const isOwner =
      Boolean(currentUser && order.userId && order.userId === currentUser.userId);
    const hasValidToken =
      Boolean(
        order.accessToken &&
          providedToken &&
          order.accessToken === providedToken
      );

    if (!isOwner && !hasValidToken) {
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
