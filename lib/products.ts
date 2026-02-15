import { prisma } from "./db";
import { Product } from "./types";

// Преобразование данных из БД в формат Product
function mapProductFromDb(dbProduct: any): Product {
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

// Получить все товары
export async function getAllProducts(): Promise<Product[]> {
  const dbProducts = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  return dbProducts.map(mapProductFromDb);
}

// Получить товар по ID (bodyId из URL)
export async function getProductById(id: string): Promise<Product | null> {
  // Сначала пытаемся найти по bodyId, если не найдено - по внутреннему id
  const dbProduct = await prisma.product.findFirst({
    where: {
      OR: [
        { bodyId: id },
        { id: id },
      ],
    },
  });
  return dbProduct ? mapProductFromDb(dbProduct) : null;
}

// Получить товары по коллекции
export async function getProductsByCollection(
  collection: string
): Promise<Product[]> {
  const dbProducts = await prisma.product.findMany({
    where: { collection },
    orderBy: { createdAt: "desc" },
  });
  return dbProducts.map(mapProductFromDb);
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
  const dbProducts = await prisma.product.findMany({
    where: {
      bestseller: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return dbProducts.map(mapProductFromDb);
}

// Получить товары со скидками (Sale)
export async function getProductsOnSale(): Promise<Product[]> {
  const dbProducts = await prisma.product.findMany({
    where: {
      discount: {
        gt: 0,
      },
    },
    orderBy: { discount: "desc" },
  });
  return dbProducts.map(mapProductFromDb);
}

// Получить товары по subcategory
export async function getProductsBySubcategory(subcategory: string): Promise<Product[]> {
  const dbProducts = await prisma.product.findMany({
    where: {
      subcategory: subcategory,
    },
    orderBy: { createdAt: "desc" },
  });
  return dbProducts.map(mapProductFromDb);
}

// Получить все часы (товары, где collection !== "Украшения")
export async function getWatchesProducts(): Promise<Product[]> {
  const dbProducts = await prisma.product.findMany({
    where: {
      collection: {
        not: "Украшения",
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return dbProducts.map(mapProductFromDb);
}

// Получить часы по subcategory
export async function getWatchesBySubcategory(subcategory: string): Promise<Product[]> {
  const dbProducts = await prisma.product.findMany({
    where: {
      collection: {
        not: "Украшения",
      },
      subcategory: subcategory,
    },
    orderBy: { createdAt: "desc" },
  });
  return dbProducts.map(mapProductFromDb);
}

// Получить все украшения (товары, где collection === "Украшения")
export async function getJewelryProducts(): Promise<Product[]> {
  const dbProducts = await prisma.product.findMany({
    where: {
      collection: "Украшения",
    },
    orderBy: { createdAt: "desc" },
  });
  return dbProducts.map(mapProductFromDb);
}

// Получить украшения по subcategory
export async function getJewelryBySubcategory(subcategory: string): Promise<Product[]> {
  const dbProducts = await prisma.product.findMany({
    where: {
      collection: "Украшения",
      subcategory: subcategory,
    },
    orderBy: { createdAt: "desc" },
  });
  return dbProducts.map(mapProductFromDb);
}
