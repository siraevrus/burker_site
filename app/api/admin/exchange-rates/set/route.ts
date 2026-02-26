import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { updateExchangeRates } from "@/lib/exchange-rates";

/**
 * POST — вручную установить курсы (например, скопированные с сайта).
 * Body: { rubPerUsd: number, rubPerEur: number } — руб за 1 USD и руб за 1 EUR.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const rubPerUsd = Number(body.rubPerUsd);
    const rubPerEur = Number(body.rubPerEur);

    if (
      !Number.isFinite(rubPerUsd) ||
      !Number.isFinite(rubPerEur) ||
      rubPerUsd <= 0 ||
      rubPerEur <= 0
    ) {
      return NextResponse.json(
        { error: "Нужны положительные числа: rubPerUsd, rubPerEur" },
        { status: 400 }
      );
    }

    const rubRate = rubPerUsd;
    const eurRate = rubPerUsd / rubPerEur;

    await updateExchangeRates(eurRate, rubRate, "manual");

    return NextResponse.json({
      success: true,
      source: "manual",
      rates: { eurRate, rubRate },
      rubPerEur: rubPerEur,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error setting exchange rates:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить курсы" },
      { status: 500 }
    );
  }
}
