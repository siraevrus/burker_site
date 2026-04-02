const ORDER_EXPIRY_HOURS = 6;

/**
 * Возвращает true, если заказ считается «закрытым»:
 * статус оплаты — pending и с момента создания прошло более 6 часов.
 */
export function isOrderExpired(order: { paymentStatus?: string | null; createdAt: Date | string }): boolean {
  if (order.paymentStatus !== "pending") return false;
  const created = new Date(order.createdAt).getTime();
  const now = Date.now();
  return now - created > ORDER_EXPIRY_HOURS * 60 * 60 * 1000;
}
