import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { updateExchangeRates } from "@/lib/exchange-rates";
import { fetchCbrRates } from "@/lib/cbr-rates";

/**
 * POST — ручное обновление курсов с сайта ЦБ РФ.
 * При недоступности ЦБ курсы в БД не изменяются (дефолты не подставляются).
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const cbr = await fetchCbrRates();
    await updateExchangeRates(cbr.eurRate, cbr.rubRate, "cbr");

    return NextResponse.json({
      success: true,
      source: "cbr",
      rates: { eurRate: cbr.eurRate, rubRate: cbr.rubRate },
      rubPerEur: cbr.rubRate / cbr.eurRate,
      updatedAt: new Date().toISOString(),
    });
  } catch (cbrError) {
    console.warn("CBR fetch failed, rates not changed:", cbrError);
    const message =
      cbrError instanceof Error ? cbrError.message : "Сайт ЦБ РФ недоступен";
    return NextResponse.json(
      {
        error: "ЦБ РФ недоступен. Курсы не изменены.",
        details: message,
        code: "CBR_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}
