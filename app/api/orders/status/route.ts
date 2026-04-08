import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function normalizePhoneInput(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
  if (!digits) return "";
  return digits.startsWith("7") ? digits : `7${digits}`;
}

function normalizeOrderRef(raw: string): string {
  return raw.trim().replace(/^#+/u, "").toUpperCase();
}

/** Prisma `cuid()` — типичная длина 25, начинается с «c». */
function looksLikeOrderId(ref: string): boolean {
  return /^c[a-z0-9]{24}$/i.test(ref);
}

const NOT_FOUND_MESSAGE =
  "Заказ не найден. Проверьте номер заказа и телефон, указанные при оформлении.";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const { allowed, retryAfterSec } = checkRateLimit(
      `order-status:${ip}`,
      20,
      60_000
    );
    if (!allowed) {
      return NextResponse.json(
        { error: `Слишком много запросов. Попробуйте через ${retryAfterSec} с.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const orderRefRaw = typeof body.orderNumber === "string" ? body.orderNumber : "";
    const phoneRaw = typeof body.phone === "string" ? body.phone : "";

    const orderRef = normalizeOrderRef(orderRefRaw);
    const phoneNorm = normalizePhoneInput(phoneRaw);

    if (!orderRef || !phoneNorm || phoneNorm.length < 11) {
      return NextResponse.json(
        { error: "Укажите номер заказа и телефон." },
        { status: 400 }
      );
    }

    let row = await prisma.order.findUnique({
      where: { orderNumber: orderRef },
      include: { items: true },
    });

    if (!row && looksLikeOrderId(orderRefRaw.trim())) {
      row = await prisma.order.findUnique({
        where: { id: orderRefRaw.trim() },
        include: { items: true },
      });
    }

    if (!row) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    const dbPhoneNorm = normalizePhoneInput(row.phone);
    if (!dbPhoneNorm || dbPhoneNorm !== phoneNorm) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    const displayNumber = row.orderNumber || row.id;

    return NextResponse.json({
      orderNumber: displayNumber,
      status: row.status,
      paymentStatus: row.paymentStatus,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      totalAmount: row.totalAmount,
      shippingCost: row.shippingCost,
      cdekAddress: row.cdekAddress || null,
      cdekPointCode: row.cdekPointCode || null,
      address: row.address || null,
      sellerTrackNumber: row.sellerTrackNumber || null,
      russiaTrackNumber: row.russiaTrackNumber || null,
      items: row.items.map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        selectedColor: it.selectedColor,
      })),
    });
  } catch (error: unknown) {
    console.error("Order status lookup error:", error);
    return NextResponse.json(
      { error: "Не удалось проверить статус. Попробуйте позже." },
      { status: 500 }
    );
  }
}
