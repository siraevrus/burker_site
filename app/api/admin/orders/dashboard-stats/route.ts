import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { mapOrderFromDb } from "@/lib/orders";
import { getOrderCommissionTotal } from "@/lib/order-commission";

/**
 * Сводная статистика по заказам для админ-дашборда.
 */
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const [statusGroups, paymentGroups, paidAggregate, ordersTotal, paidOrdersForCommission] =
      await Promise.all([
        prisma.order.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
        prisma.order.groupBy({
          by: ["paymentStatus"],
          _count: { id: true },
        }),
        prisma.order.aggregate({
          where: { paymentStatus: "paid" },
          _sum: {
            totalAmount: true,
            shippingCost: true,
            promoDiscount: true,
          },
          _count: { id: true },
        }),
        prisma.order.count(),
        prisma.order.findMany({
          where: { paymentStatus: "paid" },
          include: { items: true },
        }),
      ]);

    const statusStats: Record<string, number> = {
      accepted: 0,
      purchased: 0,
      in_transit_de: 0,
      in_transit_ru: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const row of statusGroups) {
      if (row.status in statusStats) {
        statusStats[row.status] = row._count.id;
      }
    }

    const paymentStats: Record<string, number> = {};
    for (const row of paymentGroups) {
      paymentStats[row.paymentStatus] = row._count.id;
    }

    let commissionPaidRub = 0;
    let ordersWithCommission = 0;
    for (const row of paidOrdersForCommission) {
      const order = mapOrderFromDb(row);
      const c = getOrderCommissionTotal(order, null);
      if (c != null) {
        commissionPaidRub += c;
        ordersWithCommission += 1;
      }
    }

    const paidCount = paidAggregate._count.id;
    const revenuePaidRub = paidAggregate._sum.totalAmount ?? 0;
    const shippingPaidRub = paidAggregate._sum.shippingCost ?? 0;
    const promoSumRub = paidAggregate._sum.promoDiscount ?? 0;
    const avgCheckPaidRub =
      paidCount > 0 ? Math.round((revenuePaidRub / paidCount) * 100) / 100 : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [ordersThisMonth, ordersToday, paidThisMonth] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.order.count({
        where: {
          paymentStatus: "paid",
          paidAt: { gte: startOfMonth },
        },
      }),
    ]);

    return NextResponse.json({
      overview: {
        ordersTotal,
        ordersToday,
        ordersThisMonth,
        paidCount,
        paidThisMonth,
        revenuePaidRub,
        shippingPaidRub,
        promoDiscountSumRub: promoSumRub,
        commissionPaidRub: Math.round(commissionPaidRub * 100) / 100,
        ordersWithCommission,
        avgCheckPaidRub,
      },
      byStatus: statusStats,
      byPaymentStatus: paymentStats,
    });
  } catch (error: unknown) {
    console.error("Get dashboard order stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка при получении статистики" },
      { status: 500 }
    );
  }
}
