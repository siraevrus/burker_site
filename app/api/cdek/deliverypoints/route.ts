import { NextRequest, NextResponse } from "next/server";
import {
  fetchCdekDeliveryPoints,
  toPublicDeliveryPoint,
  type CdekDeliveryPoint,
} from "@/lib/cdek";

const CACHE_MS = 24 * 60 * 60 * 1000; // 24 часа

let cache: { list: CdekDeliveryPoint[]; at: number } | null = null;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim().toLowerCase() || null;
  const type = searchParams.get("type") || null; // PVZ | POSTAMAT | пусто = все

  const clientId = process.env.CDEK_CLIENT_ID;
  const clientSecret = process.env.CDEK_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error("[CDEK API] Missing environment variables:", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    return NextResponse.json(
      { 
        error: "Сервис ПВЗ временно недоступен. Настройте CDEK_CLIENT_ID и CDEK_CLIENT_SECRET в переменных окружения.",
        details: "Проверьте файл .env на сервере или переменные окружения PM2."
      },
      { status: 503 }
    );
  }

  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return filterAndRespond(cache.list, city, type);
  }

  const rawList = await fetchCdekDeliveryPoints();
  if (rawList === null) {
    console.error("[CDEK API] Failed to fetch delivery points. Check server logs for details.");
    return NextResponse.json(
      { 
        error: "Не удалось получить список ПВЗ. Проверьте учётные данные СДЭК.",
        details: "Проверьте логи сервера (pm2 logs burker-watches) для деталей ошибки."
      },
      { status: 503 }
    );
  }

  const list = rawList.map(toPublicDeliveryPoint);
  cache = { list, at: now };

  return filterAndRespond(list, city, type);
}

function filterAndRespond(
  list: CdekDeliveryPoint[],
  city: string | null,
  type: string | null
): NextResponse {
  let result = list;

  if (city) {
    result = result.filter(
      (p) => p.city?.toLowerCase().includes(city) || p.address_full?.toLowerCase().includes(city)
    );
  }

  if (type && (type === "PVZ" || type === "POSTAMAT")) {
    result = result.filter((p) => p.type === type);
  }

  return NextResponse.json(result);
}
