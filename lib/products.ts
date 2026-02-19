import { prisma } from "./db";
import { Product } from "./types";
import { getExchangeRates, convertPrice, ExchangeRates } from "./exchange-rates";

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
  
  // Конвертируем цены из EUR в RUB с учётом наценки по категории
  // Часы (все коллекции кроме "Украшения"): +1000 руб
  // Украшения: +500 руб
  product.price = convertPrice(product.price, rates.eurRate, rates.rubRate, product.collection);
  product.originalPrice = convertPrice(product.originalPrice, rates.eurRate, rates.rubRate, product.collection);
  
  return product;
}

// Получить все товары (для сайта, без отключенных)
export async function getAllProducts(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        disabled: { not: true },
      },
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

// Получить товар по ID (bodyId из URL)
export async function getProductById(id: string): Promise<Product | null> {
  // Сначала пытаемся найти по bodyId, если не найдено - по внутреннему id
  const [dbProduct, rates] = await Promise.all([
    prisma.product.findFirst({
      where: {
        OR: [
          { bodyId: id },
          { id: id },
        ],
      },
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
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Поиск товаров по названию
export async function searchProducts(query: string): Promise<Product[]> {
  const allProducts = await getAllProducts();
  return allProducts.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase())
  );
}

// Получить бестселлеры (товары с флагом bestseller = true)
export async function getBestsellers(limit: number = 8): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        bestseller: true,
        disabled: { not: true },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить товары со скидками (Sale)
export async function getProductsOnSale(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        discount: {
          gt: 0,
        },
        disabled: { not: true },
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
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить все часы (товары, где collection !== "Украшения")
export async function getWatchesProducts(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        collection: {
          not: "Украшения",
        },
        disabled: { not: true },
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
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}

// Получить все украшения (товары, где collection === "Украшения")
export async function getJewelryProducts(): Promise<Product[]> {
  const [dbProducts, rates] = await Promise.all([
    prisma.product.findMany({
      where: {
        collection: "Украшения",
        disabled: { not: true },
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
      },
      orderBy: { createdAt: "desc" },
    }),
    getExchangeRates(),
  ]);
  return dbProducts.map((p) => mapProductFromDbWithRates(p, rates));
}
