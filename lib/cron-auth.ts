/**
 * Проверка секрета для GET-cron эндпоинтов.
 * Значения из окружения и из запроса нормализуются (trim), чтобы не ломать вызовы из-за пробелов в .env/PM2.
 */
export function getCronExpectedSecret(): string {
  return (process.env.CRON_SECRET || process.env.CRON_SECRET_KEY || "").trim();
}

/** true = запрос разрешён; если секрет в env не задан — пропускаем всех (как раньше). */
export function isCronSecretValid(providedSecret: string): boolean {
  const expected = getCronExpectedSecret();
  if (!expected) return true;
  return providedSecret.trim() === expected;
}
