import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserOrders, getOrdersByEmail } from "@/lib/orders";
import { Order } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!currentUser && !email) {
      return NextResponse.json(
        { error: "Требуется авторизация или email" },
        { status: 401 }
      );
    }

    let orders: Order[];
    if (currentUser) {
      orders = await getUserOrders(currentUser.userId);
    } else if (email) {
      orders = await getOrdersByEmail(email);
    } else {
      orders = [];
    }

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении заказов" },
      { status: 500 }
    );
  }
}
