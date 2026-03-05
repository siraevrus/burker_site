import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders";
import { getCurrentUser } from "@/lib/auth";
import { generateReceiptPdf } from "@/lib/receipt-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден" },
        { status: 404 }
      );
    }

    const currentUser = await getCurrentUser();
    const providedToken = request.nextUrl.searchParams.get("token") || "";

    const isOwner =
      currentUser && order.userId && order.userId === currentUser.userId;
    const hasValidToken =
      order.accessToken &&
      providedToken &&
      order.accessToken === providedToken;

    if (!isOwner && !hasValidToken) {
      return NextResponse.json(
        { error: "Доступ запрещен" },
        { status: 403 }
      );
    }

    const pdfBuffer = await generateReceiptPdf(id);
    const orderNumber = order.orderNumber || order.id;
    const filename = `check-${orderNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Receipt PDF generation error:", error);
    const message =
      error instanceof Error ? error.message : "Ошибка генерации чека";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
