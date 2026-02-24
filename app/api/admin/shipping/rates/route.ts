import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

/** Тарифы по умолчанию (из lib/shipping.ts) для предзаполнения */
const DEFAULT_RATES: { weightKg: number; priceRub: number }[] = [
  { weightKg: 0.1, priceRub: 1290 }, { weightKg: 0.2, priceRub: 1410 },
  { weightKg: 0.3, priceRub: 1540 }, { weightKg: 0.4, priceRub: 1670 },
  { weightKg: 0.5, priceRub: 1800 }, { weightKg: 0.6, priceRub: 1930 },
  { weightKg: 0.7, priceRub: 2050 }, { weightKg: 0.8, priceRub: 2190 },
  { weightKg: 0.9, priceRub: 2310 }, { weightKg: 1.0, priceRub: 2440 },
  { weightKg: 1.1, priceRub: 2580 }, { weightKg: 1.2, priceRub: 2730 },
  { weightKg: 1.3, priceRub: 2870 }, { weightKg: 1.4, priceRub: 3030 },
  { weightKg: 1.5, priceRub: 3170 }, { weightKg: 1.6, priceRub: 3320 },
  { weightKg: 1.7, priceRub: 3460 }, { weightKg: 1.8, priceRub: 3600 },
  { weightKg: 1.9, priceRub: 3750 }, { weightKg: 2.0, priceRub: 3890 },
];

/**
 * GET /api/admin/shipping/rates — список тарифов. Если пусто — предзаполняем и возвращаем.
 */
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    let list = await prisma.shippingRate.findMany({
      orderBy: { weightKg: "asc" },
    });

    if (list.length === 0) {
      await prisma.shippingRate.createMany({
        data: DEFAULT_RATES,
      });
      list = await prisma.shippingRate.findMany({
        orderBy: { weightKg: "asc" },
      });
    }

    return NextResponse.json({
      rates: list.map((r) => ({ id: r.id, weightKg: r.weightKg, priceRub: r.priceRub })),
    });
  } catch (error: unknown) {
    console.error("Admin shipping rates get error:", error);
    return NextResponse.json(
      { error: "Ошибка при загрузке тарифов" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/shipping/rates — сохранить таблицу тарифов.
 * Body: { rates: [{ id?, weightKg, priceRub }] } — при отсутствии id создаётся новая запись.
 */
export async function PUT(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const rates = Array.isArray(body.rates) ? body.rates : [];
    const validated: { id?: string; weightKg: number; priceRub: number }[] = [];
    for (const r of rates) {
      const weight = Number(r.weightKg);
      const price = Number(r.priceRub);
      if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(price) || price < 0) continue;
      validated.push({
        id: typeof r.id === "string" ? r.id : undefined,
        weightKg: Math.round(weight * 10) / 10,
        priceRub: Math.round(price),
      });
    }

    await prisma.shippingRate.deleteMany({});
    if (validated.length > 0) {
      await prisma.shippingRate.createMany({
        data: validated.map((r) => ({
          weightKg: r.weightKg,
          priceRub: r.priceRub,
        })),
      });
    }

    const list = await prisma.shippingRate.findMany({
      orderBy: { weightKg: "asc" },
    });
    return NextResponse.json({
      rates: list.map((r) => ({ id: r.id, weightKg: r.weightKg, priceRub: r.priceRub })),
    });
  } catch (error: unknown) {
    console.error("Admin shipping rates put error:", error);
    return NextResponse.json(
      { error: "Ошибка при сохранении тарифов" },
      { status: 500 }
    );
  }
}
