/**
 * URL JSON-каталога на сервере парсинга (импорт из админки и cron).
 * Переопределение: API_JSON_BASE, API_JSON_PATH в .env / PM2.
 */
export function getImportJsonFeedUrl(): string {
  const base = (process.env.API_JSON_BASE || "https://parcing.burker-watches.ru").replace(
    /\/+$/,
    ""
  );
  const pathRaw = process.env.API_JSON_PATH || "/api_json.php";
  const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
  return `${base}${path}?compact=1`;
}
