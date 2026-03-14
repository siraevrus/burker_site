import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Параметр email обязателен" },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        email: { equals: email },
        userId: null,
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "Гостевые заказы не найдены" },
        { status: 404 }
      );
    }

    const first = orders[0];

    const user = {
      id: `guest_${email.toLowerCase()}`,
      email: first.email,
      firstName: first.firstName,
      lastName: first.lastName,
      middleName: first.middleName,
      phone: first.phone,
      emailVerified: false,
      ipAddress: first.ipAddress,
      deviceInfo: first.deviceInfo,
      createdAt: orders[orders.length - 1].createdAt.toISOString(),
      type: "guest" as const,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        email: o.email,
        firstName: o.firstName,
        lastName: o.lastName,
        middleName: o.middleName,
        phone: o.phone,
        address: o.address,
        cdekAddress: o.cdekAddress,
        cdekPointCode: o.cdekPointCode,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalAmount: o.totalAmount,
        shippingCost: o.shippingCost,
        paidAt: o.paidAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        promoCode: o.promoCode,
        promoDiscount: o.promoDiscount,
        items: o.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          productPrice: item.productPrice,
          quantity: item.quantity,
          selectedColor: item.selectedColor,
        })),
      })),
      cartItems: [],
    };

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Get guest user error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении гостевого пользователя" },
      { status: 500 }
    );
  }
}
