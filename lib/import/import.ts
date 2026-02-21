import { prisma } from "../db";
import { validateProducts, ValidationError } from "./validate";
import { transformJsonProduct, ProductData } from "./transform";

export interface ImportResult {
  added: number;
  updated: number;
  errors: Array<{ id: string; error: string }>;
  total: number;
}

/**
 * Импорт товаров из JSON в БД
 */
export async function importProducts(jsonData: any[]): Promise<ImportResult> {
  const result: ImportResult = {
    added: 0,
    updated: 0,
    errors: [],
    total: jsonData.length,
  };

  // Валидация данных
  const validation = validateProducts(jsonData);
  if (!validation.isValid) {
    // Преобразуем ошибки валидации в формат результата
    validation.errors.forEach((error) => {
      result.errors.push({
        id: String(error.id),
        error: error.message,
      });
    });
    // Если есть критические ошибки валидации, прерываем импорт
    const criticalErrors = validation.errors.filter(
      (e) => e.field === "id" || e.field === "url"
    );
    if (criticalErrors.length > 0) {
      return result;
    }
  }

  // Обработка каждого товара
  for (const jsonProduct of jsonData) {
    try {
      // Преобразование в формат БД
      const productData = transformJsonProduct(jsonProduct);

      // Проверка существования товара по ID
      const existingProduct = await prisma.product.findUnique({
        where: { id: productData.id },
      });

      if (existingProduct) {
        // Обновление существующего товара
        const updateData: any = {
          name: productData.name,
          collection: productData.collection,
          subcategory: productData.subcategory,
          bestseller: productData.bestseller,
          price: productData.price,
          originalPrice: productData.originalPrice,
          discount: productData.discount,
          colors: productData.colors,
          images: productData.images,
          inStock: productData.inStock,
          soldOut: productData.soldOut,
          variant: productData.variant,
          description: productData.description,
          specifications: productData.specifications,
          updatedAt: productData.updatedAt,
          // Сохраняем текущее значение disabled из базы данных
          disabled: existingProduct.disabled ?? false,
        };

        // bodyId: ставим только если не занят другим товаром (уникальное поле)
        if (productData.bodyId !== null && productData.bodyId.trim() !== "") {
          const existingByBodyId = await prisma.product.findUnique({
            where: { bodyId: productData.bodyId },
          });
          if (!existingByBodyId || existingByBodyId.id === productData.id) {
            updateData.bodyId = productData.bodyId;
          }
        }

        await prisma.product.update({
          where: { id: productData.id },
          data: updateData,
        });
        result.updated++;
      } else {
        // Создание нового товара
        const createData: any = {
          id: productData.id,
          name: productData.name,
          collection: productData.collection,
          subcategory: productData.subcategory,
          bestseller: productData.bestseller,
          price: productData.price,
          originalPrice: productData.originalPrice,
          discount: productData.discount,
          colors: productData.colors,
          images: productData.images,
          inStock: productData.inStock,
          soldOut: productData.soldOut,
          disabled: false, // По умолчанию новые товары активны
          variant: productData.variant,
          description: productData.description,
          specifications: productData.specifications,
          createdAt: productData.createdAt,
          updatedAt: productData.updatedAt,
        };

        // bodyId: ставим только если ещё не занят (уникальное поле), иначе оставляем null
        if (productData.bodyId !== null && productData.bodyId.trim() !== "") {
          const existingByBodyId = await prisma.product.findUnique({
            where: { bodyId: productData.bodyId },
          });
          if (!existingByBodyId) {
            createData.bodyId = productData.bodyId;
          }
        }

        await prisma.product.create({
          data: createData,
        });
        result.added++;
      }
    } catch (error: any) {
      // Обработка ошибок при импорте отдельного товара
      result.errors.push({
        id: String(jsonProduct.id || "unknown"),
        error: error.message || "Неизвестная ошибка при импорте",
      });
    }
  }

  return result;
}
