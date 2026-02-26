import { NextRequest, NextResponse } from "next/server";
import { updateExchangeRates } from "@/lib/exchange-rates";
import { fetchCbrRates } from "@/lib/cbr-rates";
import { notifyRatesUpdated } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const headerSecret = request.headers.get("X-Cron-Secret");
  const authHeader = request.headers.get("authorization");
  let querySecret = request.nextUrl.searchParams.get("secret") || "";
  // В query символ + приходит как пробел — восстанавливаем для сравнения
  if (querySecret) querySecret = querySecret.replace(/ /g, "+");
  const providedSecret = headerSecret || authHeader?.replace(/^Bearer\s+/i, "") || querySecret || "";
  const expectedSecret = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY;

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { eurRate, rubRate } = await fetchCbrRates();
    await updateExchangeRates(eurRate, rubRate, "cbr");

    const dateReq = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\./g, "/");

    console.log(
      `Exchange rates updated (CBR): EUR=${eurRate.toFixed(4)}, RUB=${rubRate.toFixed(4)}`
    );

    await notifyRatesUpdated({ eurRate, rubRate, source: "cbr" });

    return NextResponse.json({
      success: true,
      source: "cbr",
      dateReq,
      rates: { eurRate, rubRate },
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update exchange rates";
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
