import { NextResponse } from "next/server";
import { updateExchangeRates } from "@/lib/exchange-rates";

const EXCHANGE_API_URL = "https://v6.exchangerate-api.com/v6/bfc54c3c09bc8aba6510256a/latest/usd";

interface ExchangeApiResponse {
  result: string;
  conversion_rates: {
    EUR: number;
    RUB: number;
    [key: string]: number;
  };
}

export async function GET(request: Request) {
  // Проверка секретного ключа для защиты эндпоинта
  const cronSecret = request.headers.get("X-Cron-Secret");
  const expectedSecret = process.env.CRON_SECRET;

  // Если CRON_SECRET задан в env, проверяем его
  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Запрос к API курсов валют
    const response = await fetch(EXCHANGE_API_URL, {
      cache: "no-store", // Не кэшировать
    });

    if (!response.ok) {
      throw new Error(`Exchange API returned status ${response.status}`);
    }

    const data: ExchangeApiResponse = await response.json();

    if (data.result !== "success") {
      throw new Error("Exchange API returned unsuccessful result");
    }

    const eurRate = data.conversion_rates.EUR;
    const rubRate = data.conversion_rates.RUB;

    if (!eurRate || !rubRate) {
      throw new Error("Missing EUR or RUB rates in API response");
    }

    // Сохраняем курсы в базу данных
    await updateExchangeRates(eurRate, rubRate);

    console.log(`Exchange rates updated: EUR=${eurRate}, RUB=${rubRate}`);

    return NextResponse.json({
      success: true,
      rates: {
        EUR: eurRate,
        RUB: rubRate,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}
