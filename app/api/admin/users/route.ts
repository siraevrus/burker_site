import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

interface UnifiedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  createdAt: string;
  type: "registered" | "guest";
  orders: Array<{
    id: string;
    orderNumber: string | null;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }>;
  _count: { orders: number };
}

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const orderStatus = searchParams.get("orderStatus") || "";
    const typeFilter = searchParams.get("type") || "";

    const orderWhere: any = {};
    if (orderStatus) {
      orderWhere.status = orderStatus;
    }

    const result: UnifiedUser[] = [];

    // --- Зарегистрированные пользователи ---
    if (typeFilter !== "guest") {
      let userIdsByStatus: string[] = [];
      if (orderStatus) {
        const ordersWithStatus = await prisma.order.findMany({
          where: { status: orderStatus },
          select: { userId: true },
          distinct: ["userId"],
        });
        userIdsByStatus = ordersWithStatus
          .map((o) => o.userId)
          .filter((id): id is string => id !== null);
      }

      let userIdsByMiddleName: string[] = [];
      if (search) {
        const ordersWithMiddleName = await prisma.order.findMany({
          where: { middleName: { contains: search } },
          select: { userId: true },
          distinct: ["userId"],
        });
        userIdsByMiddleName = ordersWithMiddleName
          .map((o) => o.userId)
          .filter((id): id is string => id !== null);
      }

      let userIdsToFilter: string[] | undefined = undefined;
      if (userIdsByStatus.length > 0 && userIdsByMiddleName.length > 0) {
        userIdsToFilter = userIdsByStatus.filter((id) =>
          userIdsByMiddleName.includes(id)
        );
      } else if (userIdsByStatus.length > 0) {
        userIdsToFilter = userIdsByStatus;
      } else if (userIdsByMiddleName.length > 0) {
        userIdsToFilter = userIdsByMiddleName;
      }

      const where: any = {};

      if (search) {
        const searchConditions: any[] = [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { phone: { contains: search } },
        ];
        if (userIdsByMiddleName.length > 0) {
          searchConditions.push({ id: { in: userIdsByMiddleName } });
        }
        where.OR = searchConditions;
      }

      if (userIdsToFilter) {
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { id: { in: userIdsToFilter } }];
          delete where.OR;
        } else {
          where.id = { in: userIdsToFilter };
        }
      }

      const skipRegistered =
        orderStatus && userIdsByStatus.length === 0;

      if (!skipRegistered) {
        const users = await prisma.user.findMany({
          where,
          include: {
            orders: {
              where: orderStatus ? orderWhere : undefined,
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                status: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
            _count: {
              select: {
                orders: orderStatus ? { where: orderWhere } : true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        for (const u of users) {
          result.push({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            emailVerified: u.emailVerified,
            createdAt: u.createdAt.toISOString(),
            type: "registered",
            orders: u.orders,
            _count: u._count,
          });
        }
      }
    }

    // --- Гостевые «пользователи» (заказы без userId) ---
    if (typeFilter !== "registered") {
      const guestWhere: any = { userId: null };
      if (orderStatus) {
        guestWhere.status = orderStatus;
      }
      if (search) {
        guestWhere.OR = [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { middleName: { contains: search } },
          { phone: { contains: search } },
        ];
      }

      const guestOrders = await prisma.order.findMany({
        where: guestWhere,
        select: {
          id: true,
          orderNumber: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const guestMap = new Map<
        string,
        {
          email: string;
          firstName: string;
          lastName: string | null;
          phone: string;
          firstOrderAt: Date;
          orders: Array<{
            id: string;
            orderNumber: string | null;
            totalAmount: number;
            status: string;
            createdAt: Date;
          }>;
        }
      >();

      for (const o of guestOrders) {
        const key = o.email.toLowerCase();
        const existing = guestMap.get(key);
        if (existing) {
          existing.orders.push({
            id: o.id,
            orderNumber: o.orderNumber,
            totalAmount: o.totalAmount,
            status: o.status,
            createdAt: o.createdAt,
          });
          if (o.createdAt < existing.firstOrderAt) {
            existing.firstOrderAt = o.createdAt;
          }
        } else {
          guestMap.set(key, {
            email: o.email,
            firstName: o.firstName,
            lastName: o.lastName,
            phone: o.phone,
            firstOrderAt: o.createdAt,
            orders: [
              {
                id: o.id,
                orderNumber: o.orderNumber,
                totalAmount: o.totalAmount,
                status: o.status,
                createdAt: o.createdAt,
              },
            ],
          });
        }
      }

      const registeredEmails = new Set(
        result.map((u) => u.email.toLowerCase())
      );

      for (const [email, g] of guestMap) {
        if (registeredEmails.has(email)) continue;

        result.push({
          id: `guest_${email}`,
          email: g.email,
          firstName: g.firstName,
          lastName: g.lastName,
          phone: g.phone,
          emailVerified: false,
          createdAt: g.firstOrderAt.toISOString(),
          type: "guest",
          orders: g.orders,
          _count: { orders: g.orders.length },
        });
      }
    }

    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ users: result });
  } catch (error: any) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении пользователей" },
      { status: 500 }
    );
  }
}
