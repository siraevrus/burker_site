import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - получить все промокоды или проверить промокод
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    // Если передан код, проверяем промокод
    if (code) {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!promoCode) {
        return NextResponse.json(
          { error: "Промокод не найден" },
          { status: 404 }
        );
      }

      if (!promoCode.isActive) {
        return NextResponse.json(
          { error: "Промокод не активен" },
          { status: 400 }
        );
      }

      const now = new Date();
      if (now < promoCode.validFrom || now > promoCode.validUntil) {
        return NextResponse.json(
          { error: "Промокод не действителен" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          discount: promoCode.discount,
        },
      });
    }

    // Иначе возвращаем все промокоды (для админ панели)
    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ promoCodes });
  } catch (error: any) {
    console.error("Get promo codes error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении промокодов" },
      { status: 500 }
    );
  }
}

// POST - создать новый промокод
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, discount, validFrom, validUntil, isActive } = body;

    if (!code || !discount || !validFrom || !validUntil) {
      return NextResponse.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 }
      );
    }

    // Проверяем уникальность кода
    const existing = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Промокод с таким кодом уже существует" },
        { status: 400 }
      );
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        discount: parseFloat(discount),
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
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

// PUT - обновить промокод
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, code, discount, validFrom, validUntil, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Не указан ID промокода" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (discount !== undefined) updateData.discount = parseFloat(discount);
    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (isActive !== undefined) updateData.isActive = isActive;

    // Если меняется код, проверяем уникальность
    if (code) {
      const existing = await prisma.promoCode.findFirst({
        where: {
          code: code.toUpperCase(),
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Промокод с таким кодом уже существует" },
          { status: 400 }
        );
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

// DELETE - удалить промокод
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Не указан ID промокода" },
        { status: 400 }
      );
    }

    await prisma.promoCode.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete promo code error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при удалении промокода" },
      { status: 500 }
    );
  }
}
