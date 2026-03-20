import { prisma } from "./db";
import { Product } from "./types";
import { getExchangeRates, convertPrice, ExchangeRates } from "./exchange-rates";
import { generateProductSlug, SUBcategorySlugToName } from "./utils";

export { generateProductSlug };

// Преобразование данных из БД в формат Product (без конвертации)
function mapProductFromDbRaw(dbProduct: any): Product {
  return {
    id: dbProduct.id,
    bodyId: dbProduct.bodyId || undefined,
    name: dbProduct.name,
    collection: dbProduct.collection,
    subcategory: dbProduct.subcategory || undefined,
    bestseller: dbProduct.bestseller || false,
    price: dbProduct.price,
    originalPrice: dbProduct.originalPrice,
    discount: dbProduct.discount,
    colors: JSON.parse(dbProduct.colors || "[]"),
    images: JSON.parse(dbProduct.images || "[]"),
    inStock: dbProduct.inStock,
    soldOut: dbProduct.soldOut || false,
    disabled: dbProduct.disabled || false,
    variant: dbProduct.variant || undefined,
    rating: dbProduct.rating || undefined,
    reviewsCount: dbProduct.reviewsCount || undefined,
    description: dbProduct.description || undefined,
    specifications: dbProduct.specifications
      ? JSON.parse(dbProduct.specifications)
      : undefined,
    relatedProducts: dbProduct.relatedProducts
      ? JSON.parse(dbProduct.relatedProducts)
      : undefined,
  };
}

// Преобразование данных из БД в формат Product с конвертацией цены
function mapProductFromDbWithRates(dbProduct: any, rates: ExchangeRates): Product {
  const product = mapProductFromDbRaw(dbProduct);

  // Исходная цена в EUR (до скидки) и цена продажи в EUR (для расчёта комиссии)
  product.originalPriceEur = dbProduct.originalPrice;
  product.priceEur = dbProduct.price;

  // Конвертируем цены из EUR в RUB с учётом наценки по категории
  // Часы (все коллекции кроме "Украшения"): +1000 руб
  // Украшения: +500 руб
  product.price = convertPrice(product.price, rates.eurRate, rates.rubRate, product.collection);
  product.originalPrice = convertPrice(product.originalPrice, rates.eurRate, rates.rubRate, product.collection);

  return product;
}

// Получить все товары (для сайта, без отключенных и без распроданных; только с subcategory)
export async function getAllProducts(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        disabled: { not: true },
        soldOut: false,
        subcategory: { not: null },
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить все товары для поиска (включая распроданные; без отключённых; только с subcategory)
export async function getAllProductsForSearch(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: { disabled: { not: true }, subcategory: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить все товары для админ-панели (включая отключенные)
export async function getAllProductsForAdmin(): Promise<Product[]> {
  try {
    const productsPromise = prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const ratesPromise = getExchangeRates();
    
    // Таймаут для запроса продуктов - 8 секунд
    const timeoutPromise = new Promise<Product[]>((_, reject) => 
      setTimeout(() => reject(new Error("Products fetch timeout")), 8000)
    );
    
    const [dbProducts, rates] = await Promise.race([
      Promise.all([productsPromise, ratesPromise]),
      timeoutPromise.then(() => { throw new Error("Timeout"); }),
    ]) as [any[], any];
    
    return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
  } catch (error) {
    console.error("[getAllProductsForAdmin] Error:", error);
    // Возвращаем пустой массив в случае ошибки
    return [];
  }
}

// Получить товар по slug для страницы товара (в т.ч. распроданные; отключённые не отдаём)
// @deprecated Используйте getProductByPath для новых путей /products/...
export async function getProductById(slug: string): Promise<Product | null> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        disabled: { not: true },
      },
    }),
    getExchangeRates(),
  ]);
  
  const normalizedSlug = slug.toLowerCase();
  
  const dbProduct = dbProducts.find((p) => {
    const productSlug = generateProductSlug(p.name);
    return productSlug === normalizedSlug;
  });
  
  return dbProduct ? mapProductFromDbWithRates(dbProduct, rates) : null;
}

/** Получить товар по пути /products/{category}/{subcategory}/{productSlug} */
export async function getProductByPath(
  categorySlug: string,
  subcategorySlug: string,
  productSlug: string
): Promise<Product | null> {
  const subcategoryName = SUBcategorySlugToName[subcategorySlug.toLowerCase()];
  if (!subcategoryName) return null;

  const isJewelry = categorySlug === "jewelry";
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        disabled: { not: true },
        subcategory: subcategoryName,
        collection: isJewelry ? "Украшения" : { not: "Украшения" },
      },
    }),
    getExchangeRates(),
  ]);

  const normalizedSlug = productSlug.toLowerCase();
  const dbProduct = dbProducts.find((p) => generateProductSlug(p.name) === normalizedSlug);
  return dbProduct ? mapProductFromDbWithRates(dbProduct, rates) : null;
}

// Получить товар по внутреннему id (для админки)
export async function getProductByAdminId(id: string): Promise<Product | null> {
  const [dbProduct, rates] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
    }),
    getExchangeRates(),
  ]);

  return dbProduct ? mapProductFromDbWithRates(dbProduct, rates) : null;
}

// Получить товары по коллекции
export async function getProductsByCollection(
  collection: string
): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        collection,
        disabled: { not: true },
        soldOut: false,
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Поиск товаров по названию (включая распроданные)
export async function searchProducts(query: string): Promise<Product[]> {
  const allProducts = await getAllProductsForSearch();
  return allProducts.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase())
  );
}

// Получить бестселлеры (товары с флагом bestseller = true; только с subcategory)
export async function getBestsellers(limit: number = 8): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        bestseller: true,
        disabled: { not: true },
        soldOut: false,
        subcategory: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить товары со скидками (Sale; только с subcategory)
export async function getProductsOnSale(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        discount: { gt: 0 },
        disabled: { not: true },
        soldOut: false,
        subcategory: { not: null },
      },
      orderBy: { discount: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить товары по subcategory
export async function getProductsBySubcategory(subcategory: string): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        subcategory: subcategory,
        disabled: { not: true },
        soldOut: false,
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить все часы (товары, где collection !== "Украшения"; только с subcategory)
export async function getWatchesProducts(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        collection: { not: "Украшения" },
        disabled: { not: true },
        soldOut: false,
        subcategory: { not: null },
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить часы по subcategory
export async function getWatchesBySubcategory(subcategory: string): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        collection: {
          not: "Украшения",
        },
        subcategory: subcategory,
        disabled: { not: true },
        soldOut: false,
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить случайные товары (для рекомендаций; только с subcategory)
export async function getRandomProducts(limit: number = 4): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        disabled: { not: true },
        soldOut: false,
        subcategory: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: limit * 3, // Берем больше, чтобы потом выбрать случайные
    }),
    getExchangeRates(),
  ]);
  
  // Перемешиваем и берем нужное количество
  const shuffled = dbProducts.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, limit);
  
  return selected.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить все украшения (товары, где collection === "Украшения"; только с subcategory)
export async function getJewelryProducts(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        collection: "Украшения",
        disabled: { not: true },
        soldOut: false,
        subcategory: { not: null },
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить украшения по subcategory
export async function getJewelryBySubcategory(subcategory: string): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        collection: "Украшения",
        subcategory: subcategory,
        disabled: { not: true },
        soldOut: false,
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

/** Актуальные данные товаров по id (для синхронизации корзины; без фильтра disabled/soldOut). */
export async function getProductsByIdsForCart(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
  if (unique.length === 0) return [];
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: unique } },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}
