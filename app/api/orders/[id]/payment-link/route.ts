import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  createOneTimePaymentLink,
  isTbankConfigured,
} from "@/lib/tbank";

/**
 * POST /api/orders/[id]/payment-link?token=...
 * Создаёт платёжную ссылку для заказа (повторная попытка, если не создалась при оформлении).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const providedToken = request.nextUrl.searchParams.get("token") || "";

    const dbOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!dbOrder) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    const currentUser = await getCurrentUser();
    const isOwner = currentUser && dbOrder.userId && dbOrder.userId === currentUser.userId;
    const hasValidToken = dbOrder.accessToken && providedToken && dbOrder.accessToken === providedToken;

    if (!isOwner && !hasValidToken) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    if (dbOrder.paymentStatus === "paid") {
      return NextResponse.json({ error: "Заказ уже оплачен" }, { status: 400 });
    }

    if (!isTbankConfigured()) {
      return NextResponse.json(
        { error: "Платёжная система не настроена" },
        { status: 503 }
      );
    }

    const amountKopecks = Math.round(Number(dbOrder.totalAmount) * 100);
    if (amountKopecks < 1000) {
      return NextResponse.json(
        { error: "Минимальная сумма оплаты 10 ₽" },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      (request.headers.get("x-forwarded-proto") && request.headers.get("x-forwarded-host")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`
        : request.headers.get("host")
          ? `https://${request.headers.get("host")}`
          : "");

    if (!baseUrl) {
      return NextResponse.json(
        { error: "Не удалось определить URL сайта. Задайте NEXT_PUBLIC_SITE_URL." },
        { status: 500 }
      );
    }

    const accessToken = dbOrder.accessToken || providedToken;
    const successUrl = `${baseUrl}/order-confirmation?id=${id}&paid=1&token=${encodeURIComponent(accessToken)}`;
    const failUrl = `${baseUrl}/order-confirmation?id=${id}&token=${encodeURIComponent(accessToken)}`;
    const notificationUrl = `${baseUrl}/api/webhooks/tbank`;
    const orderNumber = dbOrder.orderNumber || id;
    const description = `Оплата заказа ${orderNumber}`.slice(0, 140);

    const terminal = process.env.TBANK_TERMINAL || "";
    const sendReceipt =
      terminal.toUpperCase().includes("DEMO") ||
      process.env.TBANK_SEND_RECEIPT === "true";

    const initParams: Parameters<typeof createOneTimePaymentLink>[0] = {
      orderId: id,
      amountKopecks,
      description,
      successUrl,
      failUrl,
      notificationUrl,
    };

    if (sendReceipt && dbOrder.items.length > 0) {
      initParams.receipt = {
        email: dbOrder.email,
        taxation: "usn_income",
        items: dbOrder.items.map((item) => {
          const priceKopecks = Math.round(Number(item.productPrice) * 100);
          const qty = item.quantity;
          return {
            name: item.productName.slice(0, 128),
            price: priceKopecks,
            quantity: qty,
            amount: priceKopecks * qty,
          };
        }),
      };
    }

    const result = await createOneTimePaymentLink(initParams);

    await prisma.order.update({
      where: { id },
      data: {
        paymentId: result.qrId,
        paymentLink: result.link,
      },
    });

    return NextResponse.json({
      paymentLink: result.link,
      paymentId: result.qrId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ошибка создания ссылки";
    console.error("payment-link API error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
