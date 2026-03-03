import { NextRequest } from "next/server";

/**
 * Получает IP-адрес клиента из заголовков запроса
 */
export function getClientIp(request: NextRequest): string {
  // Проверяем x-forwarded-for (для прокси/балансировщиков)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Берем первый IP из списка (реальный IP клиента)
    return forwarded.split(",")[0].trim();
  }

  // Проверяем x-real-ip (альтернативный заголовок)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Если ничего не найдено, возвращаем unknown
  return "unknown-ip";
}

/**
 * Парсит User-Agent и определяет информацию об устройстве
 */
export function getDeviceInfo(request: NextRequest): string {
  const userAgent = request.headers.get("user-agent") || "";

  if (!userAgent) {
    return "unknown";
  }

  const ua = userAgent.toLowerCase();

  // Определяем тип устройства
  let deviceType = "desktop";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) {
    if (ua.includes("tablet") || ua.includes("ipad")) {
      deviceType = "tablet";
    } else {
      deviceType = "mobile";
    }
  }

  // Определяем операционную систему
  let os = "unknown";
  if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("mac os") || ua.includes("macos")) {
    os = "macOS";
  } else if (ua.includes("linux")) {
    os = "Linux";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) {
    os = "iOS";
  }

  // Определяем браузер
  let browser = "unknown";
  if (ua.includes("chrome") && !ua.includes("edg")) {
    browser = "Chrome";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
  } else if (ua.includes("edg")) {
    browser = "Edge";
  } else if (ua.includes("opera") || ua.includes("opr")) {
    browser = "Opera";
  }

  return `${deviceType} | ${os} | ${browser}`;
}
