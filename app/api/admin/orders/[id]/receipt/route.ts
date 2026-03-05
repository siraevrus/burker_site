import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { getOrderById } from "@/lib/orders";
import { generateReceiptPdf } from "@/lib/receipt-pdf";

/**
 * Скачивание чека (PDF) администратором
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
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
    console.error("Admin receipt PDF error:", error);
    const message =
      error instanceof Error ? error.message : "Ошибка генерации чека";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
