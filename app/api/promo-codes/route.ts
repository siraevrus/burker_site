import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET — все промокоды (админ) или проверка кода (клиент)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const email = searchParams.get("email");

    if (code) {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!promoCode) {
        return NextResponse.json({ error: "Промокод не найден" }, { status: 404 });
      }

      if (!promoCode.isActive) {
        return NextResponse.json({ error: "Промокод не активен" }, { status: 400 });
      }

      const now = new Date();
      if (now < promoCode.validFrom || now > promoCode.validUntil) {
        return NextResponse.json({ error: "Срок действия промокода истёк" }, { status: 400 });
      }

      if (email) {
        const usageCount = await prisma.promoCodeUsage.count({
          where: { promoCodeId: promoCode.id, email: email.toLowerCase() },
        });
        if (usageCount >= promoCode.usageLimit) {
          return NextResponse.json(
            { error: "Вы уже воспользовались данным промокодом" },
            { status: 400 }
          );
        }

        if (promoCode.firstOrderOnly) {
          const paidOrders = await prisma.order.count({
            where: {
              email: email.toLowerCase(),
              status: { not: "cancelled" },
            },
          });
          if (paidOrders > 0) {
            return NextResponse.json(
              { error: "Промокод распространяется только на первый заказ" },
              { status: 400 }
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          discountType: promoCode.discountType,
          discount: promoCode.discount,
          minOrderAmount: promoCode.minOrderAmount,
          firstOrderOnly: promoCode.firstOrderOnly,
        },
      });
    }

    // Для админки — все промокоды + количество использований
    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { usages: true } } },
    });

    return NextResponse.json({
      promoCodes: promoCodes.map((p) => ({
        ...p,
        usageCount: p._count.usages,
        _count: undefined,
      })),
    });
  } catch (error: any) {
    console.error("Get promo codes error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении промокодов" },
      { status: 500 }
    );
  }
}

// POST — создать промокод
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      discountType,
      discount,
      validFrom,
      validUntil,
      minOrderAmount,
      firstOrderOnly,
      usageLimit,
      isActive,
    } = body;

    if (!code || discount == null || !validFrom || !validUntil) {
      return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
    }

    const existing = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Промокод с таким кодом уже существует" }, { status: 400 });
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        discountType: discountType || "fixed",
        discount: parseFloat(discount),
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        firstOrderOnly: firstOrderOnly ?? false,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : 1,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ success: true, promoCode });
  } catch (error: any) {
    console.error("Create promo code error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при создании промокода" },
      { status: 500 }
    );
  }
}

// PUT — обновить промокод
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      code,
      discountType,
      discount,
      validFrom,
      validUntil,
      minOrderAmount,
      firstOrderOnly,
      usageLimit,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Не указан ID промокода" }, { status: 400 });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discount !== undefined) updateData.discount = parseFloat(discount);
    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (minOrderAmount !== undefined)
      updateData.minOrderAmount = minOrderAmount ? parseFloat(minOrderAmount) : null;
    if (firstOrderOnly !== undefined) updateData.firstOrderOnly = firstOrderOnly;
    if (usageLimit !== undefined) updateData.usageLimit = parseInt(usageLimit, 10);
    if (isActive !== undefined) updateData.isActive = isActive;

    if (code) {
      const existing = await prisma.promoCode.findFirst({
        where: { code: code.toUpperCase(), id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Промокод с таким кодом уже существует" }, { status: 400 });
      }
    }

    const promoCode = await prisma.promoCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, promoCode });
  } catch (error: any) {
    console.error("Update promo code error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении промокода" },
      { status: 500 }
    );
  }
}

// DELETE — удалить промокод
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Не указан ID промокода" }, { status: 400 });
    }

    await prisma.promoCode.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete promo code error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при удалении промокода" },
      { status: 500 }
    );
  }
}
