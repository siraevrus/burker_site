import { NextResponse } from "next/server";
import { updateExchangeRates } from "@/lib/exchange-rates";
import { fetchCbrRates } from "@/lib/cbr-rates";

export async function GET(request: Request) {
  const cronSecret = request.headers.get("X-Cron-Secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
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
