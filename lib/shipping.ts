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

const MAX_WEIGHT = 2.0; // Максимальный вес для расчета

export interface ShippingCalculation {
  totalWeight: number;
  totalCost: number;
}

/**
 * Получает стоимость доставки по весу с округлением вверх
 * 
 * @param weight - вес в кг
 * @returns стоимость доставки в ₽
 */
function getShippingCostByWeight(weight: number): number {
  // Если вес больше максимального, используем стоимость для максимального веса
  if (weight > MAX_WEIGHT) {
    return WEIGHT_COST_TABLE[MAX_WEIGHT];
  }

  // Округляем вес вверх до ближайшего значения из таблицы
  // Шаг таблицы: 0.1 кг
  const roundedWeight = Math.ceil(weight * 10) / 10;
  
  // Если точное совпадение есть в таблице, возвращаем стоимость
  if (WEIGHT_COST_TABLE[roundedWeight] !== undefined) {
    return WEIGHT_COST_TABLE[roundedWeight];
  }

  // Если после округления вес все еще больше максимального, используем максимум
  if (roundedWeight > MAX_WEIGHT) {
    return WEIGHT_COST_TABLE[MAX_WEIGHT];
  }

  // Находим ближайшее большее значение из таблицы
  const weights = Object.keys(WEIGHT_COST_TABLE)
    .map(Number)
    .sort((a, b) => a - b);
  
  const nextWeight = weights.find((w) => w >= roundedWeight);
  
  return nextWeight ? WEIGHT_COST_TABLE[nextWeight] : WEIGHT_COST_TABLE[MAX_WEIGHT];
}

/**
 * Рассчитывает вес и стоимость доставки на основе товаров в корзине
 * Товары группируются по категориям, для каждой категории считается общий вес
 * и стоимость доставки определяется по таблице веса
 * 
 * @param cart - массив товаров в корзине
 * @returns объект с общим весом (кг) и стоимостью доставки (₽)
 */
export function calculateShipping(cart: CartItem[]): ShippingCalculation {
  let totalWeightWatches = 0;
  let totalWeightJewelry = 0;

  // Группируем товары по категориям и считаем общий вес каждой категории
  cart.forEach((item) => {
    const isJewelry = item.collection === "Украшения";
    const weightPerUnit = isJewelry ? WEIGHT_PER_UNIT.jewelry : WEIGHT_PER_UNIT.watches;
    const categoryWeight = weightPerUnit * item.quantity;

    if (isJewelry) {
      totalWeightJewelry += categoryWeight;
    } else {
      totalWeightWatches += categoryWeight;
    }
  });

  // Рассчитываем стоимость доставки для каждой категории по таблице веса
  const costWatches = totalWeightWatches > 0 ? getShippingCostByWeight(totalWeightWatches) : 0;
  const costJewelry = totalWeightJewelry > 0 ? getShippingCostByWeight(totalWeightJewelry) : 0;

  // Суммируем общий вес и общую стоимость
  const totalWeight = totalWeightWatches + totalWeightJewelry;
  const totalCost = costWatches + costJewelry;

  return {
    totalWeight,
    totalCost,
  };
}
