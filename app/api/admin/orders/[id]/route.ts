import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendOrderPurchasedEmail,
  sendOrderInTransitToWarehouseEmail,
  sendOrderInTransitToRussiaEmail,
  sendOrderDeliveredEmail,
} from "@/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Ошибка при получении заказа";
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, purchaseProofImage, sellerTrackNumber, russiaTrackNumber } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Статус обязателен" },
        { status: 400 }
      );
    }

    const validStatuses = ["accepted", "purchased", "in_transit_de", "in_transit_ru", "delivered"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Неверный статус" },
        { status: 400 }
      );
    }

    if (status === "purchased" && !purchaseProofImage) {
      return NextResponse.json(
        { error: "Для статуса 'Выкуплен' требуется прикрепить изображение подтверждения" },
        { status: 400 }
      );
    }

    if (status === "in_transit_de" && !sellerTrackNumber) {
      return NextResponse.json(
        { error: "Для статуса 'В пути на склад' требуется указать трек-номер продавца" },
        { status: 400 }
      );
    }

    if (status === "in_transit_ru" && !russiaTrackNumber) {
      return NextResponse.json(
        { error: "Для статуса 'В пути в РФ' требуется указать трек-номер" },
        { status: 400 }
      );
    }

    const updateData: {
      status: string;
      purchaseProofImage?: string;
      sellerTrackNumber?: string;
      russiaTrackNumber?: string;
    } = { status };

    if (purchaseProofImage) {
      updateData.purchaseProofImage = purchaseProofImage;
    }
    if (sellerTrackNumber) {
      updateData.sellerTrackNumber = sellerTrackNumber;
    }
    if (russiaTrackNumber) {
      updateData.russiaTrackNumber = russiaTrackNumber;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const orderNumber = order.orderNumber || order.id.slice(0, 8);

    try {
      switch (status) {
        case "purchased":
          await sendOrderPurchasedEmail(
            order.email,
            orderNumber,
            order.firstName,
            purchaseProofImage
          );
          break;
        case "in_transit_de":
          await sendOrderInTransitToWarehouseEmail(
            order.email,
            orderNumber,
            order.firstName,
            sellerTrackNumber
          );
          break;
        case "in_transit_ru":
          await sendOrderInTransitToRussiaEmail(
            order.email,
            orderNumber,
            order.firstName,
            russiaTrackNumber
          );
          break;
        case "delivered":
          await sendOrderDeliveredEmail(
            order.email,
            orderNumber,
            order.firstName
          );
          break;
      }
    } catch (emailError) {
      console.error("Error sending status email:", emailError);
    }

    return NextResponse.json({ order });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Ошибка при обновлении заказа";
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
