import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const orderStatus = searchParams.get("orderStatus") || "";

    // Сначала находим ID пользователей по фильтру статуса заказа
    let userIdsByStatus: string[] = [];
    if (orderStatus) {
      const ordersWithStatus = await prisma.order.findMany({
        where: {
          status: orderStatus,
        },
        select: {
          userId: true,
        },
        distinct: ["userId"],
      });
      userIdsByStatus = ordersWithStatus
        .map((o) => o.userId)
        .filter((id): id is string => id !== null);
      
      if (userIdsByStatus.length === 0) {
        return NextResponse.json({ users: [] });
      }
    }

    // Находим ID пользователей по отчеству через заказы
    let userIdsByMiddleName: string[] = [];
    if (search) {
      const ordersWithMiddleName = await prisma.order.findMany({
        where: {
          middleName: { contains: search },
        },
        select: {
          userId: true,
        },
        distinct: ["userId"],
      });
      userIdsByMiddleName = ordersWithMiddleName
        .map((o) => o.userId)
        .filter((id): id is string => id !== null);
    }

    // Объединяем все ID для фильтрации
    let userIdsToFilter: string[] | undefined = undefined;
    if (userIdsByStatus.length > 0 && userIdsByMiddleName.length > 0) {
      // Пересечение: пользователи должны быть и по статусу, и по отчеству
      userIdsToFilter = userIdsByStatus.filter(id => userIdsByMiddleName.includes(id));
      if (userIdsToFilter.length === 0) {
        return NextResponse.json({ users: [] });
      }
    } else if (userIdsByStatus.length > 0) {
      userIdsToFilter = userIdsByStatus;
    } else if (userIdsByMiddleName.length > 0) {
      userIdsToFilter = userIdsByMiddleName;
    }

    // Строим условия для поиска
    const where: any = {};
    
    if (search) {
      // SQLite не поддерживает mode: "insensitive", используем обычный contains
      const searchConditions: any[] = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
      ];
      
      // Если есть пользователи по отчеству, добавляем их
      if (userIdsByMiddleName.length > 0) {
        searchConditions.push({ id: { in: userIdsByMiddleName } });
      }
      
      where.OR = searchConditions;
    }

    // Если есть фильтр по ID (от статуса или отчества), применяем его
    if (userIdsToFilter) {
      if (where.OR) {
        // Если есть поиск, фильтруем результаты поиска по ID
        where.AND = [
          { OR: where.OR },
          { id: { in: userIdsToFilter } },
        ];
        delete where.OR;
      } else {
        where.id = { in: userIdsToFilter };
      }
    }

    const orderWhere: any = {};
    if (orderStatus) {
      orderWhere.status = orderStatus;
    }

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
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            orders: orderStatus ? {
              where: orderWhere,
            } : true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении пользователей" },
      { status: 500 }
    );
  }
}
