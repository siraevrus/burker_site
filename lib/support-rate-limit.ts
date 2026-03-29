/**
 * In-memory лимитер для публичного API чата (на инстанс).
 * При нескольких репликах лимит не общий — при необходимости вынести в Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

let pruneTick = 0;

function pruneStaleBuckets(windowMs: number) {
  pruneTick += 1;
  if (pruneTick % 40 !== 0) return;
  const now = Date.now();
  const cutoff = now - windowMs * 3;
  for (const [key, b] of buckets) {
    if (b.resetAt < cutoff) buckets.delete(key);
  }
  if (buckets.size > 20_000) {
    buckets.clear();
  }
}

export function checkSupportRateLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number
): boolean {
  pruneStaleBuckets(windowMs);
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > maxPerWindow) return false;
  return true;
}
