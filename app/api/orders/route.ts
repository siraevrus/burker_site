import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserOrders } from "@/lib/orders";
import { Order } from "@/lib/types";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    const orders: Order[] = await getUserOrders(currentUser.userId);

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении заказов" },
      { status: 500 }
    );
  }
}
