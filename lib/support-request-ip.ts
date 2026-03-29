/**
 * IP для rate limiting публичного чата.
 * X-Real-IP обычно выставляет nginx и клиент не подделает.
 * X-Forwarded-For учитываем только при TRUST_X_FORWARDED_FOR=1 (за доверенным прокси).
 */
export function getSupportRequestClientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) {
    const first = real.split(",")[0].trim();
    if (first) return first.slice(0, 64);
  }
  if (process.env.TRUST_X_FORWARDED_FOR === "1") {
    const xf = request.headers.get("x-forwarded-for");
    if (xf) {
      const first = xf.split(",")[0].trim();
      if (first) return first.slice(0, 64);
    }
  }
  return "unknown";
}
