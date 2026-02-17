import { prisma } from "./db";

// Дефолтные значения курсов (fallback)
const DEFAULT_EUR_RATE = 0.85;
const DEFAULT_RUB_RATE = 80.0;

// Кэш курсов в памяти
let cachedRates: { eurRate: number; rubRate: number; updatedAt: Date } | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут в миллисекундах

export interface ExchangeRates {
  eurRate: number;
  rubRate: number;
  updatedAt: Date | null;
}

/**
 * Получить текущие курсы валют из БД (с кэшированием)
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Проверяем кэш
  if (cachedRates && now - cacheTimestamp < CACHE_TTL) {
    return cachedRates;
  }

  try {
    const rates = await prisma.exchangeRate.findUnique({
      where: { id: "current" },
    });

    if (rates) {
      cachedRates = {
        eurRate: rates.eurRate,
        rubRate: rates.rubRate,
        updatedAt: rates.updatedAt,
      };
      cacheTimestamp = now;
      return cachedRates;
    }
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
  }

  // Возвращаем дефолтные значения
  return {
    eurRate: DEFAULT_EUR_RATE,
    rubRate: DEFAULT_RUB_RATE,
    updatedAt: null,
  };
}

/**
 * Обновить курсы валют в БД
 */
export async function updateExchangeRates(eurRate: number, rubRate: number): Promise<void> {
  console.log(`[updateExchangeRates] Saving rates: EUR=${eurRate}, RUB=${rubRate}`);
  
  try {
    // Используем upsert для атомарной операции
    const result = await prisma.exchangeRate.upsert({
      where: { id: "current" },
      update: {
        eurRate,
        rubRate,
      },
      create: {
        id: "current",
        eurRate,
        rubRate,
      },
    });
    console.log(`[updateExchangeRates] Saved successfully:`, result);
  } catch (error) {
    console.error(`[updateExchangeRates] Error saving to DB:`, error);
    // Не прерываем выполнение — курсы будут храниться в кэше
  }

  // Обновляем кэш в любом случае (даже если БД не сработала)
  cachedRates = {
    eurRate,
    rubRate,
    updatedAt: new Date(),
  };
  cacheTimestamp = Date.now();
}

// Наценка по категории товара
const CATEGORY_MARKUP = {
  watches: 1000, // Часы: +1000 руб
  jewelry: 500,  // Украшения: +500 руб
};

/**
 * Конвертировать цену из EUR в RUB по формуле:
 * ((price / EUR) * 1.01) * (RUB + 5) + наценка по категории
 * 
 * @param priceEur - цена товара в EUR
 * @param eurRate - курс EUR к USD
 * @param rubRate - курс RUB к USD
 * @param collection - коллекция товара (для определения наценки)
 * @returns цена в RUB
 */
export function convertPrice(
  priceEur: number, 
  eurRate: number, 
  rubRate: number, 
  collection?: string
): number {
  // ((price / EUR) * 1.01) * (RUB + 5)
  const priceInUsd = priceEur / eurRate;
  const priceWithMargin = priceInUsd * 1.01; // +1% наценка
  const priceInRub = priceWithMargin * (rubRate + 5); // RUB + 5
  
  // Добавляем наценку по категории
  let categoryMarkup = 0;
  if (collection) {
    if (collection === "Украшения") {
      categoryMarkup = CATEGORY_MARKUP.jewelry; // +500 руб для украшений
    } else {
      categoryMarkup = CATEGORY_MARKUP.watches; // +1000 руб для часов (все остальные коллекции)
    }
  }
  
  const totalPrice = priceInRub + categoryMarkup;
  
  // Округляем вверх до ближайшей сотни (13445 → 13500)
  return Math.ceil(totalPrice / 100) * 100;
}

/**
 * Получить курсы и сразу конвертировать цену
 */
export async function convertPriceWithCurrentRates(priceEur: number): Promise<number> {
  const rates = await getExchangeRates();
  return convertPrice(priceEur, rates.eurRate, rates.rubRate);
}
