import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { logError, logEvent } from "@/lib/ops-log";
import { buildAdvanceFiscalReceiptItems } from "@/lib/fiscal-receipt";
import { sendFiscalReceipt, isOrangeDataEnabled } from "@/lib/orange-data";

const VALID_PAYMENT_STATUSES = ["paid", "pending", "cancelled", "expired", "failed"] as const;
type PaymentStatus = (typeof VALID_PAYMENT_STATUSES)[number];

/**
 * Ручное изменение статуса оплаты заказа (админ).
 *
 * При переводе в «paid»:
 * - проставляется paidAt (если не было);
 * - опционально (triggerFiscal: true) отправляется авансовый фискальный чек.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const requestId = crypto.randomUUID();
    const body = await request.json();

    const newStatus = typeof body.paymentStatus === "string" ? body.paymentStatus : "";
    if (!VALID_PAYMENT_STATUSES.includes(newStatus as PaymentStatus)) {
      return NextResponse.json(
        {
          error: `Допустимые статусы: ${VALID_PAYMENT_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    if (order.paymentStatus === newStatus) {
      return NextResponse.json({ error: "Статус уже установлен" }, { status: 400 });
    }

    const data: Record<string, unknown> = { paymentStatus: newStatus };
    if (newStatus === "paid" && !order.paidAt) {
      data.paidAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data,
      include: {
        items: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    logEvent("admin_payment_status_manual", {
      requestId,
      orderId: order.id,
      previousStatus: order.paymentStatus,
      newStatus,
      adminAction: true,
    });

    let fiscalResult: { sent: boolean; docId?: string; error?: string } | null = null;

    if (
      newStatus === "paid" &&
      body.triggerFiscal === true &&
      !order.fiscalReceiptId
    ) {
      if (await isOrangeDataEnabled()) {
        try {
          const receiptItems = buildAdvanceFiscalReceiptItems(
            Number(order.totalAmount)
          ).map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            tax: item.tax,
            paymentMethodType: item.paymentMethodType,
            paymentSubjectType: item.paymentSubjectType,
            supplierINN: item.supplierINN,
            supplierInfo: item.supplierInfo,
            agentType: item.agentType,
          }));

          const result = await sendFiscalReceipt({
            orderId: order.id,
            email: order.email,
            items: receiptItems,
            totalAmount: order.totalAmount,
          });

          await prisma.order.update({
            where: { id: order.id },
            data: {
              fiscalReceiptId: result.docId ?? null,
              fiscalReceiptStatus: result.success ? "sent" : "error",
            },
          });

          fiscalResult = {
            sent: result.success,
            docId: result.docId,
            error: result.error,
          };

          if (!result.success) {
            logError("OrangeData_manual_sendReceipt", {
              requestId,
              orderId: order.id,
              error: result.error,
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          fiscalResult = { sent: false, error: msg };
          logError("OrangeData_manual_sendReceipt_exception", {
            requestId,
            orderId: order.id,
            error: msg,
          });
        }
      } else {
        fiscalResult = { sent: false, error: "Orange Data не настроен или отключён" };
      }
    }

    const orderOut = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      order: orderOut ?? updatedOrder,
      previousStatus: order.paymentStatus,
      newStatus,
      fiscalResult,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Ошибка при изменении статуса оплаты";
    logError("admin_payment_status_manual_error", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
