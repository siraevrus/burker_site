import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { getExchangeRates } from "@/lib/exchange-rates";

/**
 * GET — текущие курсы (на момент парсинга / используемые в приложении)
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const rates = await getExchangeRates();
    // rubRate = руб за 1 USD; руб за 1 EUR = rubRate / eurRate
    const rubPerEur = rates.rubRate / rates.eurRate;

    return NextResponse.json({
      eurRate: rates.eurRate,
      rubRate: rates.rubRate,
      rubPerEur,
      updatedAt: rates.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}
