import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOrderPaidEmail } from "@/lib/email";

const TBANK_WEBHOOK_IP_WHITELIST = [
  "212.233.80.7",
  "91.218.132.2",
];

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  if (clientIp && !TBANK_WEBHOOK_IP_WHITELIST.includes(clientIp)) {
    console.warn("T-Bank webhook: rejected IP", clientIp);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const paymentId =
    typeof b.qrId === "string"
      ? b.qrId
      : typeof b.id === "string"
        ? b.id
        : typeof b.paymentId === "string"
          ? b.paymentId
          : null;

  const rawStatus = b.status ?? b.Status;
  const status =
    typeof rawStatus === "string"
      ? (rawStatus.toUpperCase() as "PAID" | "CANCELLED" | "EXPIRED")
      : null;

  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id (qrId)" }, { status: 400 });
  }
  if (!status || !["PAID", "CANCELLED", "EXPIRED"].includes(status)) {
    return NextResponse.json({ error: "Missing or invalid status" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { paymentId },
  });

  if (!order) {
    return NextResponse.json({ ok: true });
  }

  const paymentStatusMap = {
    PAID: "paid",
    CANCELLED: "cancelled",
    EXPIRED: "expired",
  } as const;
  const newPaymentStatus = paymentStatusMap[status];

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: newPaymentStatus,
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
    },
  });

  if (status === "PAID") {
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

  return NextResponse.json({ ok: true });
}
