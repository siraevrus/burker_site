import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { logError, logEvent } from "@/lib/ops-log";
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
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

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
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const requestId = crypto.randomUUID();
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Некорректное тело запроса" },
        { status: 400 }
      );
    }

    const status = typeof body.status === "string" ? body.status : "";
    const purchaseProofImage =
      typeof body.purchaseProofImage === "string" ? body.purchaseProofImage.trim() : "";
    const sellerTrackNumber =
      typeof body.sellerTrackNumber === "string" ? body.sellerTrackNumber.trim() : "";
    const russiaTrackNumber =
      typeof body.russiaTrackNumber === "string" ? body.russiaTrackNumber.trim() : "";

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

    let emailNotification: { sent: boolean; error?: string } = { sent: false };
    try {
      switch (status) {
        case "purchased":
          emailNotification.sent = await sendOrderPurchasedEmail(
            order.email,
            orderNumber,
            order.firstName,
            purchaseProofImage
          );
          break;
        case "in_transit_de":
          emailNotification.sent = await sendOrderInTransitToWarehouseEmail(
            order.email,
            orderNumber,
            order.firstName,
            sellerTrackNumber
          );
          break;
        case "in_transit_ru":
          emailNotification.sent = await sendOrderInTransitToRussiaEmail(
            order.email,
            orderNumber,
            order.firstName,
            russiaTrackNumber
          );
          break;
        case "delivered":
          emailNotification.sent = await sendOrderDeliveredEmail(
            order.email,
            orderNumber,
            order.firstName
          );
          break;
        default:
          emailNotification = { sent: true };
          break;
      }
      if (!emailNotification.sent) {
        emailNotification.error = "Email не отправлен";
      }
    } catch (emailError) {
      console.error("Error sending status email:", emailError);
      emailNotification = {
        sent: false,
        error: emailError instanceof Error ? emailError.message : "Ошибка отправки email",
      };
    }

    logEvent("admin_order_status_updated", {
      requestId,
      orderId: order.id,
      status,
      emailSent: emailNotification.sent,
      emailError: emailNotification.error || null,
    });

    return NextResponse.json({ order, emailNotification });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Ошибка при обновлении заказа";
    logError("admin_order_status_update_error", {
      error: errorMessage,
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
