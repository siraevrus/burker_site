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

  if (!process.env.CDEK_CLIENT_ID || !process.env.CDEK_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Сервис ПВЗ временно недоступен. Настройте CDEK_CLIENT_ID и CDEK_CLIENT_SECRET." },
      { status: 503 }
    );
  }

  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return filterAndRespond(cache.list, city, type);
  }

  const rawList = await fetchCdekDeliveryPoints();
  if (rawList === null) {
    return NextResponse.json(
      { error: "Не удалось получить список ПВЗ. Проверьте учётные данные СДЭК." },
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
