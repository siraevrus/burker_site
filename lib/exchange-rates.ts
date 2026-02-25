import { prisma } from "./db";

// Дефолтные значения курсов (fallback): 80 ₽/USD, 95 ₽/EUR
const DEFAULT_RUB_RATE = 80.0;
const DEFAULT_EUR_RATE = 80 / 95; // коэффициент для пересчёта (RUB/USD)/(RUB/EUR)

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
    // Добавляем таймаут для запроса к БД
    const ratesPromise = prisma.exchangeRate.findUnique({
      where: { id: "current" },
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 3000)
    );
    
    const rates = await Promise.race([ratesPromise, timeoutPromise]) as any;

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
    // Используем кэш, если он есть, даже если истек
    if (cachedRates) {
      return cachedRates;
    }
  }

  // Возвращаем дефолтные значения
  return {
    eurRate: DEFAULT_EUR_RATE,
    rubRate: DEFAULT_RUB_RATE,
    updatedAt: null,
  };
}

/**
 * Обновить курсы валют в БД и записать в историю
 * @param source — источник: "cbr" (ЦБ РФ) или "default" (дефолт при ошибке)
 */
export async function updateExchangeRates(
  eurRate: number,
  rubRate: number,
  source: string = "manual"
): Promise<void> {
  console.log(`[updateExchangeRates] Saving rates: EUR=${eurRate}, RUB=${rubRate}, source=${source}`);

  try {
    await prisma.$transaction([
      prisma.exchangeRate.upsert({
        where: { id: "current" },
        update: { eurRate, rubRate },
        create: { id: "current", eurRate, rubRate },
      }),
      prisma.exchangeRateHistory.create({
        data: { eurRate, rubRate, source },
      }),
    ]);
  } catch (error) {
    console.error(`[updateExchangeRates] Error saving to DB:`, error);
  }

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
