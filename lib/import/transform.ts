/**
 * Преобразование данных товара из JSON формата в формат БД
 */

export interface ProductData {
  id: string;
  bodyId: string | null;
  name: string;
  collection: string;
  subcategory: string | null; // Сохраняем оригинальную subcategory из JSON
  bestseller: boolean; // Флаг бестселлера из JSON
  price: number;
  originalPrice: number;
  discount: number;
  colors: string; // JSON string
  images: string; // JSON string
  inStock: boolean;
  soldOut: boolean; // Sold_out: 1 = распродан (soldOut = true), 0 = в наличии (soldOut = false)
  variant: string | null;
  description: string | null;
  specifications: string | null; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Парсинг subcategory для извлечения collection и variant
 */
function parseSubcategory(subcategory: string | null): { collection: string; variant: string | null } {
  if (!subcategory) {
    return { collection: "Unknown", variant: null };
  }

  const hasPetite = /petite/i.test(subcategory);
  const collection = hasPetite
    ? subcategory.replace(/\s*petite\s*/gi, "").trim()
    : subcategory.trim();

  return {
    collection: collection || "Unknown",
    variant: hasPetite ? "Petite" : null,
  };
}

/**
 * Определение коллекции с учетом category
 */
function determineCollection(
  category: string | null,
  subcategory: string | null
): { collection: string; variant: string | null } {
  // Если category === "украшения", переопределяем collection
  if (category === "украшения") {
    return { collection: "Украшения", variant: null };
  }

  // Иначе используем subcategory
  return parseSubcategory(subcategory);
}

/**
 * Парсинг даты из формата "YYYY-MM-DD HH:MM:SS"
 */
function parseDateTime(dateStr: string | null): Date {
  if (!dateStr) return new Date();

  // Формат: "2026-02-15 12:32:34"
  const parsed = new Date(dateStr.replace(" ", "T"));
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Парсинг specifications из строки в объект
 */
function parseSpecifications(specs: string | null): object | null {
  if (!specs) return null;

  const lines = specs.split("\n").filter((line) => line.trim());
  const result: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (key && value) {
        result[key] = value;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : { raw: specs };
}

/**
 * Преобразование товара из JSON формата в формат БД
 */
export function transformJsonProduct(jsonProduct: any): ProductData {
  // ID: number → string (внутренний ID БД)
  const id = String(jsonProduct.id);

  // Body ID: string | null → string | null (для использования в URL)
  const bodyId = jsonProduct.body_id || null;

  // Name: string | null → string
  const name = jsonProduct.name || "";

  // Цены и скидка
  const price = parseFloat(jsonProduct.price) || 0;
  const comparePrice = jsonProduct.compare_price
    ? parseFloat(jsonProduct.compare_price)
    : price;
  const originalPrice = comparePrice || price;
  const discount =
    originalPrice > price && originalPrice > 0
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  // Коллекция и вариант
  const { collection, variant } = determineCollection(
    jsonProduct.category,
    jsonProduct.subcategory
  );

  // Сохраняем оригинальную subcategory из JSON
  const subcategory = jsonProduct.subcategory || null;

  // Флаг бестселлера: 1 = true, 0 = false
  const bestseller = jsonProduct.bestseller === 1 || jsonProduct.bestseller === true;

  // Цвета: извлечь name из объектов, где available === true. Если поле не заполнено, null или пусто — не учитываем
  let colorNames: string[] = [];
  if (Array.isArray(jsonProduct.colors) && jsonProduct.colors.length > 0) {
    colorNames = jsonProduct.colors
      .filter((color: any) => color != null && color?.available === true)
      .map((color: any) => (color?.name != null ? String(color.name).trim() : ""))
      .filter((name: string) => name.length > 0);
  } else if (jsonProduct.color != null && jsonProduct.color !== "") {
    const single = String(jsonProduct.color).trim();
    if (single) colorNames = [single];
  }
  const colors = JSON.stringify(colorNames);

  // Изображения: извлечь url из объектов
  const imageUrls =
    Array.isArray(jsonProduct.images) && jsonProduct.images.length > 0
      ? jsonProduct.images.map((img: any) => {
          let url = img?.url || "";
          // Если URL начинается с //, добавить https:
          if (url.startsWith("//")) {
            url = "https:" + url;
          }
          return url;
        })
      : [];
  const images = JSON.stringify(imageUrls);

  // Наличие товара: если есть цвета — по доступности цвета; если цветов нет — по soldOut
  const inStock =
    colorNames.length > 0
      ? Array.isArray(jsonProduct.colors) &&
        jsonProduct.colors.some((color: any) => color?.available === true)
      : !(
          jsonProduct.Sold_out === 1 ||
          jsonProduct.Sold_out === true ||
          jsonProduct.Sold_out === "1"
        );

  // Sold_out: 1 = распродан (soldOut = true), 0 = в наличии (soldOut = false)
  // Если поле отсутствует, считаем товар в наличии (soldOut = false)
  const soldOut =
    jsonProduct.Sold_out === 1 ||
    jsonProduct.Sold_out === true ||
    jsonProduct.Sold_out === "1";

  // Описание
  const description = jsonProduct.description?.trim() || null;

  // Specifications: парсинг строки в объект
  const specsObj = parseSpecifications(jsonProduct.specifications);
  const specifications = specsObj ? JSON.stringify(specsObj) : null;

  // Даты
  const createdAt = parseDateTime(jsonProduct.created_at);
  const updatedAt = parseDateTime(jsonProduct.updated_at);

  return {
    id,
    bodyId,
    name,
    collection,
    subcategory,
    bestseller,
    price,
    originalPrice,
    discount,
    colors,
    images,
    inStock,
    soldOut,
    variant,
    description,
    specifications,
    createdAt,
    updatedAt,
  };
}
