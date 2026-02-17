import { CartItem } from "./types";

/**
 * Параметры доставки по категориям товаров
 */
const SHIPPING_CONFIG = {
  watches: {
    weightPerUnit: 0.3, // кг
    costPerUnit: 1540, // ₽
  },
  jewelry: {
    weightPerUnit: 0.1, // кг
    costPerUnit: 1290, // ₽
  },
};

export interface ShippingCalculation {
  totalWeight: number;
  totalCost: number;
}

/**
 * Рассчитывает вес и стоимость доставки на основе товаров в корзине
 * 
 * @param cart - массив товаров в корзине
 * @returns объект с общим весом (кг) и стоимостью доставки (₽)
 */
export function calculateShipping(cart: CartItem[]): ShippingCalculation {
  let totalWeight = 0;
  let totalCost = 0;

  cart.forEach((item) => {
    // Определяем категорию: если collection === "Украшения", то украшения, иначе часы
    const isJewelry = item.collection === "Украшения";
    const config = isJewelry ? SHIPPING_CONFIG.jewelry : SHIPPING_CONFIG.watches;

    // Суммируем вес и стоимость с учетом количества товаров
    totalWeight += config.weightPerUnit * item.quantity;
    totalCost += config.costPerUnit * item.quantity;
  });

  return {
    totalWeight,
    totalCost,
  };
}
