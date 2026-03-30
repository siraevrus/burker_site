import type { Order, OrderItem } from "./types";

export interface ExchangeRates {
  eurRate: number;
  rubRate: number;
}

/** Курсы с заказа (приоритет) или живые с API — для старых заказов без сохранённых курсов */
export function getRatesForOrder(
  order: Pick<Order, "eurRate" | "rubRate">,
  liveRates: ExchangeRates | null
): ExchangeRates | null {
  if (order.eurRate != null && order.rubRate != null) {
    return { eurRate: order.eurRate, rubRate: order.rubRate };
  }
  return liveRates;
}

/** Вознаграждение комиссионера по строке (как при создании заказа или пересчёт по курсам) */
export function getItemCommission(
  item: OrderItem,
  rates: ExchangeRates | null
): number | null {
  if (item.commissionAmount != null) return item.commissionAmount;
  if (!rates || item.originalPriceEur == null) return null;
  const originalPriceInUsd = item.originalPriceEur / rates.eurRate;
  const originalPriceInRub = originalPriceInUsd * rates.rubRate;
  return (item.productPrice - originalPriceInRub) * item.quantity;
}

export function getOrderCommissionTotal(
  order: Order,
  liveRates: ExchangeRates | null
): number | null {
  const rates = getRatesForOrder(order, liveRates);
  let total = 0;
  let hasAny = false;
  for (const item of order.items) {
    const c = getItemCommission(item, rates);
    if (c !== null) {
      hasAny = true;
      total += c;
    }
  }
  return hasAny ? total : null;
}
