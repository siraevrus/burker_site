import { NextRequest, NextResponse } from "next/server";
import { updateExchangeRates } from "@/lib/exchange-rates";
import { fetchCbrRates } from "@/lib/cbr-rates";
import { isCronSecretValid } from "@/lib/cron-auth";
import { notifyRatesUpdated } from "@/lib/telegram";

// Дефолты при недоступности ЦБ: 80 ₽/USD, 95 ₽/EUR
const DEFAULT_RUB_RATE = 80;
const DEFAULT_EUR_RATE = 80 / 95;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const xCronSecret = request.headers.get("x-cron-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const providedSecret =
    authHeader?.replace(/^Bearer\s+/i, "")?.trim() ||
    xCronSecret?.trim() ||
    querySecret?.trim() ||
    "";

  if (!isCronSecretValid(providedSecret)) {
    console.warn(
      "[Cron] update-rates: 401 — неверный или пустой секрет (CRON_SECRET / X-Cron-Secret / ?secret=)"
    );
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

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

    const dateReq = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\./g, "/");

    console.log(
      `Exchange rates updated (${source === "cbr" ? "CBR" : "default"}): EUR=${eurRate.toFixed(2)}, RUB=${rubRate.toFixed(2)}`
    );

    // Отправка уведомления в Telegram
    try {
      const telegramOk = await notifyRatesUpdated({
        eurRate,
        rubRate,
        source: source === "cbr" ? "ЦБ РФ" : "по умолчанию",
      });
      if (!telegramOk) {
        console.warn(
          "[Cron] update-rates: уведомление в Telegram не отправлено (см. логи [Telegram] выше)"
        );
      }
    } catch (telegramError) {
      console.error("Failed to send Telegram notification:", telegramError);
      // Не прерываем выполнение при ошибке отправки в Telegram
    }

    return NextResponse.json({
      success: true,
      source,
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
