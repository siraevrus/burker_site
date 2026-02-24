import { CartItem } from "./types";

/**
 * Вес одной единицы товара по категориям
 */
const WEIGHT_PER_UNIT = {
  watches: 0.3, // кг
  jewelry: 0.1, // кг
};

/**
 * Таблица соответствия веса и стоимости доставки
 */
const WEIGHT_COST_TABLE: Record<number, number> = {
  0.1: 1290,
  0.2: 1410,
  0.3: 1540,
  0.4: 1670,
  0.5: 1800,
  0.6: 1930,
  0.7: 2050,
  0.8: 2190,
  0.9: 2310,
  1.0: 2440,
  1.1: 2580,
  1.2: 2730,
  1.3: 2870,
  1.4: 3030,
  1.5: 3170,
  1.6: 3320,
  1.7: 3460,
  1.8: 3600,
  1.9: 3750,
  2.0: 3890,
};

const MAX_WEIGHT = 2.0; // Максимальный вес для расчета (при использовании встроенной таблицы)

export interface ShippingCalculation {
  totalWeight: number;
  totalCost: number;
}

export type ShippingRateEntry = { weight: number; price: number };

function getShippingCostByWeight(
  weight: number,
  table?: ShippingRateEntry[]
): number {
  const tableMap: Record<number, number> = {};
  let maxW = 0;
  if (table && table.length > 0) {
    table.forEach((r) => {
      tableMap[r.weight] = r.price;
      if (r.weight > maxW) maxW = r.weight;
    });
  } else {
    Object.assign(tableMap, WEIGHT_COST_TABLE);
    maxW = MAX_WEIGHT;
  }

  if (weight > maxW) return tableMap[maxW] ?? 0;
  const roundedWeight = Math.ceil(weight * 10) / 10;
  if (tableMap[roundedWeight] !== undefined) return tableMap[roundedWeight];
  if (roundedWeight > maxW) return tableMap[maxW] ?? 0;
  const weights = Object.keys(tableMap)
    .map(Number)
    .sort((a, b) => a - b);
  const nextWeight = weights.find((w) => w >= roundedWeight);
  return nextWeight != null ? tableMap[nextWeight] : tableMap[maxW] ?? 0;
}

/**
 * Рассчитывает вес и стоимость доставки на основе товаров в корзине.
 * Товары группируются по категориям, для каждой категории считается общий вес
 * и стоимость доставки по таблице веса.
 *
 * @param cart - массив товаров в корзине
 * @param rates - опционально таблица тарифов [{ weight, price }]; если не передана — используется встроенная
 */
export function calculateShipping(
  cart: CartItem[],
  rates?: ShippingRateEntry[]
): ShippingCalculation {
  let totalWeightWatches = 0;
  let totalWeightJewelry = 0;

  cart.forEach((item) => {
    const isJewelry = item.collection === "Украшения";
    const weightPerUnit = isJewelry ? WEIGHT_PER_UNIT.jewelry : WEIGHT_PER_UNIT.watches;
    const categoryWeight = weightPerUnit * item.quantity;
    if (isJewelry) totalWeightJewelry += categoryWeight;
    else totalWeightWatches += categoryWeight;
  });

  const costWatches =
    totalWeightWatches > 0 ? getShippingCostByWeight(totalWeightWatches, rates) : 0;
  const costJewelry =
    totalWeightJewelry > 0 ? getShippingCostByWeight(totalWeightJewelry, rates) : 0;
  const totalWeight = totalWeightWatches + totalWeightJewelry;
  const totalCost = costWatches + costJewelry;

  return { totalWeight, totalCost };
}
