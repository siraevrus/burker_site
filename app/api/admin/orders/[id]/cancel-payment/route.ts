import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { cancelPayment, isTbankConfigured } from "@/lib/tbank";
import { logError, logEvent } from "@/lib/ops-log";
import { sendOrderCancelledEmail } from "@/lib/email";

/**
 * Отмена или возврат платежа через T-Bank API
 * Согласно документации: https://developer.tbank.ru/eacq/scenarios/cancel_confirm/
 * - Отмена платежа: в статусе AUTHORIZED (холдирование)
 * - Возврат платежа: в статусе CONFIRMED (полная оплата)
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
    
    // Опциональная сумма для частичной отмены/возврата (в копейках)
    const amountKopecks = typeof body.amountKopecks === "number" && body.amountKopecks > 0
      ? body.amountKopecks
      : undefined;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден" },
        { status: 404 }
      );
    }

    if (!order.paymentId) {
      return NextResponse.json(
        { error: "У заказа нет ID платежа" },
        { status: 400 }
      );
    }

    // Проверяем, что платеж можно отменить/вернуть
    if (order.paymentStatus === "cancelled" || order.paymentStatus === "expired" || order.paymentStatus === "failed") {
      return NextResponse.json(
        { error: "Платеж уже отменен или истек" },
        { status: 400 }
      );
    }

    if (!isTbankConfigured()) {
      return NextResponse.json(
        { error: "T-Bank не настроен" },
        { status: 500 }
      );
    }

    // Подготовка параметров для отмены/возврата
    const cancelParams: {
      paymentId: string | number;
      amountKopecks?: number;
      receipt?: {
        email: string;
        taxation: "usn_income";
        items: Array<{
          name: string;
          price: number;
          quantity: number;
          amount: number;
        }>;
      };
    } = {
      paymentId: order.paymentId,
    };

    // Если указана сумма для частичной отмены/возврата
    if (amountKopecks !== undefined) {
      cancelParams.amountKopecks = amountKopecks;
      
      // Для частичного возврата нужно передать Receipt с позициями
      // Формируем чек возврата на основе позиций заказа пропорционально сумме возврата
      const totalAmountKopecks = Math.round(order.totalAmount * 100);
      const refundRatio = amountKopecks / totalAmountKopecks;
      
      const receiptItems = order.items.map((item) => {
        const itemAmountKopecks = Math.round(item.productPrice * item.quantity * 100);
        const refundAmountKopecks = Math.round(itemAmountKopecks * refundRatio);
        return {
          name: item.productName.slice(0, 128),
          price: Math.round(item.productPrice * 100),
          quantity: item.quantity,
          amount: refundAmountKopecks,
        };
      });
      
      // Добавляем доставку, если есть
      if (order.shippingCost > 0) {
        const shippingKopecks = Math.round(order.shippingCost * 100);
        const refundShippingKopecks = Math.round(shippingKopecks * refundRatio);
        receiptItems.push({
          name: "Доставка",
          price: shippingKopecks,
          quantity: 1,
          amount: refundShippingKopecks,
        });
      }
      
      // Корректируем сумму для точного соответствия
      const itemsSum = receiptItems.reduce((s, i) => s + i.amount, 0);
      const diff = amountKopecks - itemsSum;
      if (diff !== 0 && receiptItems.length > 0) {
        const lastItem = receiptItems[receiptItems.length - 1];
        lastItem.amount += diff;
      }
      
      cancelParams.receipt = {
        email: order.email,
        taxation: "usn_income",
        items: receiptItems,
      };
    }

    try {
      // Вызываем метод отмены/возврата T-Bank
      const cancelResult = await cancelPayment(cancelParams);

      if (!cancelResult.success) {
        throw new Error("Не удалось отменить платеж");
      }

      // Обновляем статус заказа в зависимости от результата
      // Статусы T-Bank: CANCELED, REVERSED (отмена), REFUNDED, PARTIAL_REFUNDED (возврат)
      const tbankStatus = cancelResult.status?.toUpperCase() || "";
      let newPaymentStatus = order.paymentStatus;
      
      // После успешной отмены/возврата платеж считается отмененным
      if (cancelResult.success) {
        if (tbankStatus === "CANCELED" || tbankStatus === "CANCELLED" || 
            tbankStatus === "REVERSED" || tbankStatus === "REFUNDED" || 
            tbankStatus === "PARTIAL_REFUNDED") {
          newPaymentStatus = "cancelled";
        } else {
          // Если статус не определен, но операция успешна, помечаем как отмененный
          newPaymentStatus = "cancelled";
        }
      }

      // Обновляем заказ
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          paymentStatus: newPaymentStatus,
        },
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

      // Отправка email уведомления клиенту об отмене заказа
      let emailSent = false;
      let emailError: string | null = null;
      try {
        const orderNumber = updatedOrder.orderNumber || updatedOrder.id.slice(0, 8);
        emailSent = await sendOrderCancelledEmail(
          updatedOrder.email,
          orderNumber,
          updatedOrder.firstName,
          updatedOrder.totalAmount,
          updatedOrder.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.productPrice * item.quantity,
          }))
        );
        if (!emailSent) {
          emailError = "Email не отправлен";
        }
      } catch (emailErr) {
        console.error("Error sending cancellation email:", emailErr);
        emailError = emailErr instanceof Error ? emailErr.message : "Ошибка отправки email";
      }

      logEvent("admin_payment_cancelled", {
        requestId,
        orderId: order.id,
        paymentId: order.paymentId,
        tbankStatus,
        amountKopecks: amountKopecks || Math.round(order.totalAmount * 100),
        isPartial: amountKopecks !== undefined,
        emailSent,
        emailError: emailError || null,
      });

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        tbankStatus,
        message: amountKopecks !== undefined
          ? "Частичный возврат выполнен успешно"
          : "Платеж отменен/возвращен успешно",
        emailSent,
        emailError,
      });
    } catch (tbankError) {
      const errorMsg = tbankError instanceof Error ? tbankError.message : String(tbankError);
      console.error("T-Bank cancel payment error:", tbankError);
      
      logError("admin_payment_cancel_error", {
        requestId,
        orderId: order.id,
        paymentId: order.paymentId,
        error: errorMsg,
      });

      return NextResponse.json(
        { error: `Ошибка при отмене платежа: ${errorMsg}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Ошибка при отмене платежа";
    logError("admin_payment_cancel_error", {
      error: errorMessage,
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
