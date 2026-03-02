import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOrderPaidEmail } from "@/lib/email";
import { verifyNotificationToken } from "@/lib/tbank";

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

  // EACQ: CONFIRMED / AUTHORIZED — успешная оплата; REJECTED, CANCELLED, DEADLINE_EXPIRED — неуспех
  const isPaid =
    success &&
    (status === "CONFIRMED" || status === "AUTHORIZED");
  const isCancelledOrExpired = [
    "REJECTED",
    "CANCELLED",
    "REFUNDED",
    "DEADLINE_EXPIRED",
    "EXPIRED",
  ].includes(status);

  const order = await prisma.order.findFirst({
    where: { paymentId },
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

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: newPaymentStatus,
      ...(isPaid ? { paidAt: new Date() } : {}),
    },
  });

  if (isPaid) {
    try {
      const orderNumber = order.orderNumber || order.id.slice(0, 8);
      await sendOrderPaidEmail(
        order.email,
        orderNumber,
        order.firstName,
        order.totalAmount
      );
    } catch (emailError) {
      console.error("T-Bank webhook: sendOrderPaidEmail failed", emailError);
    }
  }

  return okResponse();
}
