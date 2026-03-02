import { NextRequest, NextResponse } from "next/server";
import {
  fetchCdekDeliveryPoints,
  toPublicDeliveryPoint,
  type CdekDeliveryPoint,
} from "@/lib/cdek";

const CACHE_MS = 24 * 60 * 60 * 1000; // 24 часа

let cache: { list: CdekDeliveryPoint[]; at: number } | null = null;

export async function GET(request: NextRequest) {
  try {
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
          details: "Проверьте файл .env на сервере и перезапустите PM2: pm2 restart burker-watches.",
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
          error: "Не удалось получить список ПВЗ. Проверьте учётные данные СДЭК и логи сервера.",
          details: "pm2 logs burker-watches",
        },
        { status: 503 }
      );
    }

    const list = rawList
      .map((raw) => {
        try {
          return toPublicDeliveryPoint(raw);
        } catch (e) {
          console.warn("[CDEK API] Skip invalid point:", raw?.code, e);
          return null;
        }
      })
      .filter((p): p is CdekDeliveryPoint => p !== null);
    cache = { list, at: now };

    return filterAndRespond(list, city, type);
  } catch (err) {
    console.error("[CDEK API] Unhandled error:", err);
    return NextResponse.json(
      {
        error: "Сервис ПВЗ временно недоступен. Попробуйте позже.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 503 }
    );
  }
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
