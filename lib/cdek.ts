/**
 * Утилиты для работы с API СДЭК (только серверная часть).
 * Учётные данные — из env: CDEK_CLIENT_ID, CDEK_CLIENT_SECRET.
 */

const CDEK_OAUTH_URL = "https://api.cdek.ru/v2/oauth/token";
const CDEK_BASE_URL = "https://api.cdek.ru/v2";

let tokenCache: { access_token: string; expires_at: number } | null = null;

/**
 * Получает OAuth access_token для API СДЭК.
 * Кэширует токен до истечения срока (expires_in от API, с запасом 60 сек).
 */
export async function getCdekAccessToken(): Promise<string | null> {
  const clientId = process.env.CDEK_CLIENT_ID;
  const clientSecret = process.env.CDEK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[CDEK] Missing credentials:", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0,
    });
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expires_at > now + 60) {
    return tokenCache.access_token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(CDEK_OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[CDEK] OAuth error:", {
      status: res.status,
      statusText: res.statusText,
      response: text,
      url: CDEK_OAUTH_URL,
    });
    return null;
  }

  let data;
  try {
    data = (await res.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };
  } catch (error) {
    console.error("[CDEK] Failed to parse OAuth response:", error);
    return null;
  }

  tokenCache = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ?? 3600),
  };

  console.log("[CDEK] OAuth token obtained successfully, expires in:", data.expires_in, "seconds");
  return data.access_token;
}

/** Сырой объект location из ответа СДЭК */
export interface CdekLocation {
  country_code?: string;
  region_code?: number;
  region?: string;
  city_code?: number;
  city?: string;
  postal_code?: string;
  address?: string;
  address_full?: string;
  latitude?: number;
  longitude?: number;
  city_uuid?: string;
}

/** Один пункт выдачи из ответа GET /v2/deliverypoints */
export interface CdekDeliveryPointRaw {
  code: string;
  name?: string;
  uuid?: string;
  type?: string;
  location?: CdekLocation;
  work_time?: string;
  work_time_list?: Array<{ day: number; time: string }>;
  phones?: Array<{ number: string }>;
  email?: string;
}

/** Упрощённый пункт выдачи для отдачи клиенту */
export interface CdekDeliveryPoint {
  code: string;
  uuid: string | null;
  type: string;
  address: string;
  address_full: string;
  city: string;
  work_time: string;
  latitude: number | null;
  longitude: number | null;
  phones: string[];
}

/**
 * Запрашивает список ПВЗ у СДЭК. Без токена возвращает null.
 */
export async function fetchCdekDeliveryPoints(): Promise<CdekDeliveryPointRaw[] | null> {
  const token = await getCdekAccessToken();
  if (!token) {
    console.error("[CDEK] Cannot fetch delivery points: no access token");
    return null;
  }

  const url = `${CDEK_BASE_URL}/deliverypoints`;
  console.log("[CDEK] Fetching delivery points from:", url, "token:", token.substring(0, 20) + "...");
  
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`, // Отправляем полный токен
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[CDEK] Delivery points error:", {
      status: res.status,
      statusText: res.statusText,
      response: text,
      url,
    });
    return null;
  }

  let data;
  try {
    data = await res.json();
  } catch (error) {
    console.error("[CDEK] Failed to parse delivery points response:", error);
    return null;
  }

  if (!Array.isArray(data)) {
    console.error("[CDEK] Unexpected delivery points response format:", typeof data);
    return null;
  }

  console.log("[CDEK] Successfully fetched", data.length, "delivery points");
  return data;
}

/**
 * Преобразует сырой пункт выдачи в упрощённый формат для клиента.
 */
export function toPublicDeliveryPoint(raw: CdekDeliveryPointRaw): CdekDeliveryPoint {
  const loc = raw.location ?? {};
  const address = loc.address ?? "";
  const addressFull = loc.address_full ?? address;
  const city = loc.city ?? "";
  const workTime = raw.work_time ?? "";
  const phones = (raw.phones ?? []).map((p) => p.number).filter(Boolean);

  return {
    code: raw.code,
    uuid: raw.uuid ?? null,
    type: raw.type ?? "PVZ",
    address,
    address_full: addressFull,
    city,
    work_time: workTime,
    latitude: loc.latitude ?? null,
    longitude: loc.longitude ?? null,
    phones,
  };
}
