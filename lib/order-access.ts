/** URL API заказа: доступ по cookie владельца или по секретному токену из ссылки. */
export function getOrderApiUrl(orderId: string, token: string | null): string {
  if (!token) return `/api/orders/${orderId}`;
  return `/api/orders/${orderId}?token=${encodeURIComponent(token)}`;
}

/** Добавить token к пути страницы заказа (уже с query при необходимости). */
export function appendAccessToken(path: string, token: string | null): string {
  if (!token) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}token=${encodeURIComponent(token)}`;
}
