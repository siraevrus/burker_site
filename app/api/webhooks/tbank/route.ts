import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOrderConfirmation, sendOrderPaidEmail, sendOrderNotPaidEmail, sendReceiptPdfEmail } from "@/lib/email";
import { calculateShippingFromLines } from "@/lib/shipping";
import { verifyNotificationToken } from "@/lib/tbank";
import { notifyNewOrder } from "@/lib/telegram";
import { buildFiscalReceiptItems } from "@/lib/fiscal-receipt";
import { sendFiscalReceipt, isOrangeDataEnabled } from "@/lib/orange-data";
import { logError } from "@/lib/ops-log";

const TBANK_PASSWORD = process.env.TBANK_PASSWORD;

// EACQ: ответ на уведомление должен быть HTTP 200 с телом "OK" (без тегов, заглавными)
function okResponse() {
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // EACQ: проверка подписи (Token) обязательна
  if (!TBANK_PASSWORD) {
    console.warn("T-Bank webhook: TBANK_PASSWORD not set, cannot verify");
    return okResponse();
  }
  if (!verifyNotificationToken(b, TBANK_PASSWORD)) {
    console.warn("T-Bank webhook: invalid Token");
    return NextResponse.json({ error: "Invalid Token" }, { status: 403 });
  }

  // PaymentId в EACQ — число, сохраняем в БД как строку
  const paymentIdRaw = b.PaymentId ?? b.paymentId ?? b.qrId ?? b.id;
  const paymentId =
    paymentIdRaw !== undefined && paymentIdRaw !== null
      ? String(paymentIdRaw)
      : null;

  if (!paymentId) {
    return NextResponse.json({ error: "Missing PaymentId" }, { status: 400 });
  }

  const success = b.Success === true || b.Success === "true";
  const rawStatus = b.Status ?? b.status;
  const status =
    typeof rawStatus === "string" ? rawStatus.toUpperCase() : "";

  // EACQ: CONFIRMED — итоговое подтверждение; AUTHORIZED — холдирование (T-Bank шлёт оба одновременно)
  // Отправляем письмо только по CONFIRMED, чтобы избежать дублирования
  const isPaid = success && status === "CONFIRMED";
  const isCancelledOrExpired = [
    "REJECTED",
    "CANCELLED",
    "CANCELED",
    "REFUNDED",
    "PARTIAL_REFUNDED",
    "REVERSED",
    "DEADLINE_EXPIRED",
    "EXPIRED",
  ].includes(status);

  const order = await prisma.order.findFirst({
    where: { paymentId },
    include: { items: true },
  });

  if (!order) {
    return okResponse();
  }

  const newPaymentStatus = isPaid
    ? "paid"
    : isCancelledOrExpired
      ? status === "DEADLINE_EXPIRED" || status === "EXPIRED"
        ? "expired"
        : "cancelled"
      : order.paymentStatus; // не меняем при неизвестном статусе

  const statusChanged = order.paymentStatus !== newPaymentStatus;
  const wasPaid = order.paymentStatus === "paid";
  const wasCancelledOrExpired = ["cancelled", "expired"].includes(order.paymentStatus);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: newPaymentStatus,
      ...(isPaid && !order.paidAt ? { paidAt: new Date() } : {}),
    },
  });

  // Письма клиенту — только при CONFIRMED (AUTHORIZED игнорируем)
  if (isPaid && statusChanged && !wasPaid) {
    try {
      const orderNumber = order.orderNumber || order.id.slice(0, 8);
      const orderItems = order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.productPrice * item.quantity,
      }));

      const productIds = [...new Set(order.items.map((i) => i.productId))];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, collection: true },
      });
      const collById = new Map(products.map((p) => [p.id, p.collection]));
      const shippingLines = order.items.map((i) => ({
        collection: collById.get(i.productId) ?? "",
        quantity: i.quantity,
      }));
      const rateRows = await prisma.shippingRate.findMany({
        orderBy: { weightKg: "asc" },
      });
      const shippingRates =
        rateRows.length > 0
          ? rateRows.map((r) => ({ weight: r.weightKg, price: r.priceRub }))
          : undefined;
      const { totalWeight: totalWeightKg } = calculateShippingFromLines(
        shippingLines,
        shippingRates
      );

      // Письмо "Спасибо за заказ! Принят в обработку"
      try {
        await sendOrderConfirmation(order.email, orderNumber, {
          firstName: order.firstName,
          totalAmount: order.totalAmount,
          items: orderItems,
          shippingCost: order.shippingCost,
          totalWeightKg,
          promoDiscount: order.promoDiscount ?? 0,
        });
      } catch (confirmationErr) {
        console.error("T-Bank webhook: sendOrderConfirmation failed", confirmationErr);
      }

      // Письмо "Оплата получена"
      await sendOrderPaidEmail(
        order.email,
        orderNumber,
        order.firstName,
        order.totalAmount,
        orderItems
      );

      // Отправка уведомления в Telegram только после оплаты заказа
      try {
        await notifyNewOrder({
          orderNumber,
          orderId: order.id,
          email: order.email,
          firstName: order.firstName,
          phone: order.phone,
          totalAmount: order.totalAmount,
          itemsCount: order.items.length,
          items: order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
          })),
        });
      } catch (telegramError) {
        console.error("T-Bank webhook: notifyNewOrder failed", telegramError);
      }

      // Фискализация Orange Data (54-ФЗ)
      if (await isOrangeDataEnabled()) {
        try {
          const receiptItems = buildFiscalReceiptItems(order).map((item) => ({
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
          if (!result.success) {
            logError("OrangeData_sendReceipt", { error: result.error, orderId: order.id });
          } else {
            try {
              await sendReceiptPdfEmail(
                order.email,
                order.firstName,
                order.orderNumber || order.id.slice(0, 8),
                order.id
              );
            } catch (receiptEmailErr) {
              console.error("T-Bank webhook: sendReceiptPdfEmail failed", receiptEmailErr);
            }
          }
        } catch (orangeErr) {
          console.error("T-Bank webhook: Orange Data sendFiscalReceipt failed", orangeErr);
          logError("OrangeData_sendReceipt", {
            error: orangeErr instanceof Error ? orangeErr.message : String(orangeErr),
            orderId: order.id,
          });
          await prisma.order.update({
            where: { id: order.id },
            data: { fiscalReceiptStatus: "error" },
          });
        }
      }
    } catch (emailError) {
      console.error("T-Bank webhook: sendOrderPaidEmail failed", emailError);
    }
  }
  // Письмо "Заказ не оплачен" — только если статус изменился на cancelled/expired
  else if (isCancelledOrExpired && statusChanged && !wasCancelledOrExpired && !wasPaid) {
    try {
      const orderNumber = order.orderNumber || order.id.slice(0, 8);
      await sendOrderNotPaidEmail(
        order.email,
        orderNumber,
        order.firstName,
        Number(order.totalAmount)
      );
    } catch (emailError) {
      console.error("T-Bank webhook: sendOrderNotPaidEmail failed", emailError);
    }
  }

  return okResponse();
}
