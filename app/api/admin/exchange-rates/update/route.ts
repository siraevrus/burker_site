import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { updateExchangeRates } from "@/lib/exchange-rates";
import { fetchCbrRates } from "@/lib/cbr-rates";

// Дефолты при недоступности ЦБ: 80 ₽/USD, 95 ₽/EUR
const DEFAULT_RUB_RATE = 80;
const DEFAULT_EUR_RATE = 80 / 95;

/**
 * POST — ручное обновление курсов (ЦБ РФ или дефолты при ошибке)
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    let eurRate: number;
    let rubRate: number;
    let source: string;

    try {
      const cbr = await fetchCbrRates();
      eurRate = cbr.eurRate;
      rubRate = cbr.rubRate;
      source = "cbr";
    } catch (cbrError) {
      console.warn("CBR fetch failed, using defaults:", cbrError);
      eurRate = DEFAULT_EUR_RATE;
      rubRate = DEFAULT_RUB_RATE;
      source = "default";
    }

    await updateExchangeRates(eurRate, rubRate);

    return NextResponse.json({
      success: true,
      source,
      rates: { eurRate, rubRate },
      rubPerEur: rubRate / eurRate,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}
