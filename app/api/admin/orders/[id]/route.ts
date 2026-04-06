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
import { sendClosingFiscalReceipt, isOrangeDataEnabled } from "@/lib/orange-data";

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

const ADMIN_ORDER_REF_MAX_LEN = 200;

/** Частичное обновление полей заказа (без смены статуса). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await request.json();
    if (!body || typeof body !== "object" || !("adminOrderRef" in body)) {
      return NextResponse.json(
        { error: "Ожидается поле adminOrderRef (строка или null)" },
        { status: 400 }
      );
    }

    let adminOrderRef: string | null;
    if (body.adminOrderRef === null || body.adminOrderRef === "") {
      adminOrderRef = null;
    } else if (typeof body.adminOrderRef === "string") {
      const t = body.adminOrderRef.trim();
      adminOrderRef = t.length === 0 ? null : t.slice(0, ADMIN_ORDER_REF_MAX_LEN);
    } else {
      return NextResponse.json(
        { error: "adminOrderRef должен быть строкой или null" },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: { adminOrderRef },
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

    logEvent("admin_order_ref_updated", { orderId: order.id });

    return NextResponse.json({ order });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }
    const errorMessage =
      error instanceof Error ? error.message : "Ошибка при обновлении заказа";
    console.error("Patch order error:", error);
    logError("admin_order_patch_error", { error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/** Полное удаление заказа из БД (позиции — каскадом; у промокодов снимается привязка к заказу). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, email: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.promoCodeUsage.updateMany({
        where: { orderId: id },
        data: { orderId: null },
      }),
      prisma.order.delete({ where: { id } }),
    ]);

    logEvent("admin_order_deleted", {
      orderId: id,
      orderNumber: existing.orderNumber,
      email: existing.email,
    });

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Ошибка при удалении заказа";
    console.error("Delete order error:", error);
    logError("admin_order_delete_error", { error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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
    const adminOrderRef =
      typeof body.adminOrderRef === "string" ? body.adminOrderRef.trim() : "";

    let deliveryToRussiaRub: number | undefined;
    if (body.deliveryToRussiaRub !== undefined && body.deliveryToRussiaRub !== null) {
      const n = Number(body.deliveryToRussiaRub);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { error: "Стоимость доставки до РФ должна быть неотрицательным числом" },
          { status: 400 }
        );
      }
      deliveryToRussiaRub = n;
    }

    let customsOrderDate: Date | undefined;
    if (body.customsOrderDate !== undefined && body.customsOrderDate !== null) {
      const raw =
        typeof body.customsOrderDate === "string"
          ? body.customsOrderDate.trim()
          : "";
      if (!raw) {
        return NextResponse.json({ error: "Укажите дату ордера" }, { status: 400 });
      }
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Некорректная дата ордера" }, { status: 400 });
      }
      customsOrderDate = d;
    }

    let cbrEurRubOnOrderDate: number | undefined;
    if (body.cbrEurRubOnOrderDate !== undefined && body.cbrEurRubOnOrderDate !== null) {
      const n = Number(body.cbrEurRubOnOrderDate);
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json(
          { error: "Курс EUR/RUB ЦБ должен быть положительным числом" },
          { status: 400 }
        );
      }
      cbrEurRubOnOrderDate = n;
    }

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

    if (status === "purchased") {
      if (!purchaseProofImage) {
        return NextResponse.json(
          { error: "Для статуса 'Выкуплен' требуется прикрепить изображение подтверждения" },
          { status: 400 }
        );
      }
      if (!adminOrderRef) {
        return NextResponse.json(
          { error: "Для статуса 'Выкуплен' укажите номер ордера" },
          { status: 400 }
        );
      }
      if (!customsOrderDate) {
        return NextResponse.json(
          { error: "Для статуса 'Выкуплен' укажите дату ордера" },
          { status: 400 }
        );
      }
      if (cbrEurRubOnOrderDate === undefined) {
        return NextResponse.json(
          { error: "Для статуса 'Выкуплен' укажите курс EUR/RUB ЦБ" },
          { status: 400 }
        );
      }
    }

    if (status === "in_transit_de" && !sellerTrackNumber) {
      return NextResponse.json(
        { error: "Для статуса 'В пути на склад' требуется указать трек-номер продавца" },
        { status: 400 }
      );
    }

    if (status === "in_transit_ru") {
      const existingForRef = await prisma.order.findUnique({
        where: { id },
        select: { adminOrderRef: true },
      });
      if (!existingForRef?.adminOrderRef?.trim()) {
        return NextResponse.json(
          {
            error:
              "Укажите номер ордера (поле «Номер ордера») в карточке заказа перед переводом в статус «В пути в РФ»",
          },
          { status: 400 }
        );
      }
      if (!russiaTrackNumber) {
        return NextResponse.json(
          { error: "Для статуса 'В пути в РФ' требуется указать трек-номер" },
          { status: 400 }
        );
      }
      if (deliveryToRussiaRub === undefined) {
        return NextResponse.json(
          { error: "Для статуса 'В пути в РФ' укажите стоимость доставки до РФ" },
          { status: 400 }
        );
      }
      if (!customsOrderDate) {
        return NextResponse.json(
          { error: "Для статуса 'В пути в РФ' укажите дату ордера" },
          { status: 400 }
        );
      }
      if (cbrEurRubOnOrderDate === undefined) {
        return NextResponse.json(
          { error: "Для статуса 'В пути в РФ' укажите курс EUR/RUB ЦБ" },
          { status: 400 }
        );
      }
    }

    const updateData: {
      status: string;
      purchaseProofImage?: string;
      sellerTrackNumber?: string;
      russiaTrackNumber?: string;
      adminOrderRef?: string;
      deliveryToRussiaRub?: number | null;
      customsOrderDate?: Date | null;
      cbrEurRubOnOrderDate?: number | null;
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
    if (status === "purchased") {
      updateData.adminOrderRef = adminOrderRef;
      updateData.customsOrderDate = customsOrderDate!;
      updateData.cbrEurRubOnOrderDate = cbrEurRubOnOrderDate!;
    }
    if (status === "in_transit_ru") {
      updateData.deliveryToRussiaRub = deliveryToRussiaRub!;
      updateData.customsOrderDate = customsOrderDate!;
      updateData.cbrEurRubOnOrderDate = cbrEurRubOnOrderDate!;
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
        emailNotification.error = "Email не отправлен (Mailopost вернул ошибку)";
        logError("admin_order_email_not_sent", {
          requestId,
          orderId: order.id,
          orderNumber,
          status,
          to: order.email,
          mailopostError: emailNotification.error,
          hint: "Подробности смотри выше в логах [Mailopost]",
        });
      } else {
        logEvent("admin_order_email_sent", {
          requestId,
          orderId: order.id,
          orderNumber,
          status,
          to: order.email,
        });
      }
    } catch (emailError) {
      console.error("Error sending status email:", emailError);
      emailNotification = {
        sent: false,
        error: emailError instanceof Error ? emailError.message : "Ошибка отправки email",
      };
      logError("admin_order_email_exception", {
        requestId,
        orderId: order.id,
        status,
        to: order.email,
        error: emailNotification.error,
      });
    }

    let fiscalClosingNotification: {
      sent: boolean;
      docId?: string;
      error?: string;
      skipped?: string;
    } | null = null;

    if (status === "in_transit_ru" && order.paymentStatus === "paid") {
      if (order.fiscalClosingReceiptId) {
        logEvent("OrangeData_closingReceipt_skip", {
          requestId,
          orderId: order.id,
          reason: "already_has_closing_doc",
          fiscalClosingReceiptId: order.fiscalClosingReceiptId,
        });
      } else {
        const odOn = await isOrangeDataEnabled();
        if (!odOn) {
          fiscalClosingNotification = {
            sent: false,
            skipped: "Orange Data отключён в админке или не настроен (сертификаты / env).",
          };
          logEvent("OrangeData_closingReceipt_skip", {
            requestId,
            orderId: order.id,
            reason: "orange_disabled_or_unconfigured",
          });
        } else {
          const ref = order.adminOrderRef?.trim() ?? "";
          const dRub = order.deliveryToRussiaRub;
          const cDate = order.customsOrderDate;
          const cbr = order.cbrEurRubOnOrderDate;
          const missing: string[] = [];
          if (!ref) missing.push("Номер ордера (adminOrderRef)");
          if (dRub == null) missing.push("Стоимость доставки до РФ");
          if (!cDate) missing.push("Дата ордера");
          if (cbr == null) missing.push("Курс EUR/RUB ЦБ");

          if (missing.length > 0) {
            fiscalClosingNotification = {
              sent: false,
              skipped: `Закрывающий чек не отправлялся: в данных заказа после сохранения нет полей: ${missing.join(", ")}. Проверьте модалку «В пути в РФ» и сохранение.`,
            };
            logEvent("OrangeData_closingReceipt_skip", {
              requestId,
              orderId: order.id,
              reason: "missing_fields_after_update",
              missingFields: missing,
            });
          } else {
            const deliveryRub = dRub as number;
            const orderDate = cDate as Date;
            const cbrRate = cbr as number;
            try {
              const closingDocKey = `${order.id}-close`;
              logEvent("OrangeData_closingReceipt_start", {
                requestId,
                orderId: order.id,
                closingDocKeyLen: closingDocKey.length,
                closingDocKeyPreview: closingDocKey.slice(0, 72),
              });
              const fiscalResult = await sendClosingFiscalReceipt({
                orderId: `${order.id}-close`,
                email: order.email,
                adminOrderRef: ref,
                totalAmount: order.totalAmount,
                deliveryToRussiaRub: deliveryRub,
                customsOrderDate: orderDate,
                cbrEurRubOnOrderDate: cbrRate,
                items: order.items.map((it) => ({
                  originalPriceEur: it.originalPriceEur,
                  quantity: it.quantity,
                })),
              });
              fiscalClosingNotification = {
                sent: fiscalResult.success,
                docId: fiscalResult.docId,
                error: fiscalResult.error,
              };
              await prisma.order.update({
                where: { id: order.id },
                data: {
                  fiscalClosingReceiptId: fiscalResult.success ? fiscalResult.docId ?? null : null,
                  fiscalClosingReceiptStatus: fiscalResult.success ? "sent" : "error",
                },
              });
              if (!fiscalResult.success) {
                logError("OrangeData_closingReceipt", {
                  requestId,
                  orderId: order.id,
                  error: fiscalResult.error,
                });
              }
            } catch (fiscalErr) {
              const msg =
                fiscalErr instanceof Error ? fiscalErr.message : String(fiscalErr);
              fiscalClosingNotification = { sent: false, error: msg };
              await prisma.order.update({
                where: { id: order.id },
                data: { fiscalClosingReceiptStatus: "error" },
              });
              logError("OrangeData_closingReceipt_exception", {
                requestId,
                orderId: order.id,
                error: msg,
              });
            }
          }
        }
      }
    } else if (status === "in_transit_ru") {
      logEvent("OrangeData_closingReceipt_skip", {
        requestId,
        orderId: order.id,
        reason: "not_paid",
        paymentStatus: order.paymentStatus,
      });
    }

    const orderOut = await prisma.order.findUnique({
      where: { id: order.id },
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

    logEvent("admin_order_status_updated", {
      requestId,
      orderId: order.id,
      status,
      emailSent: emailNotification.sent,
      emailError: emailNotification.error || null,
      fiscalClosingSent: fiscalClosingNotification?.sent ?? null,
    });

    return NextResponse.json({
      order: orderOut ?? order,
      emailNotification,
      fiscalClosingNotification,
    });
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
