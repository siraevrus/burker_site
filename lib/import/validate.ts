export interface ValidationError {
  id: number | string;
  field?: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Валидация массива товаров из JSON
 */
export function validateProducts(jsonData: any[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(jsonData)) {
    return {
      isValid: false,
      errors: [{ id: "root", message: "Данные должны быть массивом" }],
    };
  }

  if (jsonData.length === 0) {
    return {
      isValid: false,
      errors: [{ id: "root", message: "Массив товаров пуст" }],
    };
  }

  jsonData.forEach((product, index) => {
    const productId = product?.id ?? `index_${index}`;

    // Проверка обязательных полей
    if (product.id === undefined || product.id === null) {
      errors.push({
        id: productId,
        field: "id",
        message: "Поле 'id' обязательно и не может быть пустым",
      });
    }

    if (!product.url || typeof product.url !== "string") {
      errors.push({
        id: productId,
        field: "url",
        message: "Поле 'url' обязательно и должно быть строкой",
      });
    }

    // Валидация типов
    if (product.id !== undefined && typeof product.id !== "number") {
      errors.push({
        id: productId,
        field: "id",
        message: "Поле 'id' должно быть числом",
      });
    }

    if (product.name !== undefined && product.name !== null && typeof product.name !== "string") {
      errors.push({
        id: productId,
        field: "name",
        message: "Поле 'name' должно быть строкой или null",
      });
    }

    if (product.price !== undefined && product.price !== null && typeof product.price !== "string") {
      errors.push({
        id: productId,
        field: "price",
        message: "Поле 'price' должно быть строкой или null",
      });
    }

    if (product.compare_price !== undefined && product.compare_price !== null && typeof product.compare_price !== "string") {
      errors.push({
        id: productId,
        field: "compare_price",
        message: "Поле 'compare_price' должно быть строкой или null",
      });
    }

    // Валидация массивов
    if (product.colors !== undefined && !Array.isArray(product.colors)) {
      errors.push({
        id: productId,
        field: "colors",
        message: "Поле 'colors' должно быть массивом",
      });
    }

    if (product.images !== undefined && !Array.isArray(product.images)) {
      errors.push({
        id: productId,
        field: "images",
        message: "Поле 'images' должно быть массивом",
      });
    }

    // Валидация формата цен (если не пустые)
    if (product.price && typeof product.price === "string" && product.price.trim() !== "") {
      const priceNum = parseFloat(product.price);
      if (isNaN(priceNum) || priceNum < 0) {
        errors.push({
          id: productId,
          field: "price",
          message: `Некорректный формат цены: "${product.price}"`,
        });
      }
    }

    if (product.compare_price && typeof product.compare_price === "string" && product.compare_price.trim() !== "") {
      const comparePriceNum = parseFloat(product.compare_price);
      if (isNaN(comparePriceNum) || comparePriceNum < 0) {
        errors.push({
          id: productId,
          field: "compare_price",
          message: `Некорректный формат старой цены: "${product.compare_price}"`,
        });
      }
    }

    // Валидация элементов массива colors
    if (Array.isArray(product.colors)) {
      product.colors.forEach((color: any, colorIndex: number) => {
        if (!color || typeof color !== "object") {
          errors.push({
            id: productId,
            field: `colors[${colorIndex}]`,
            message: "Элемент массива colors должен быть объектом",
          });
        } else {
          if (color.name !== undefined && typeof color.name !== "string") {
            errors.push({
              id: productId,
              field: `colors[${colorIndex}].name`,
              message: "Поле 'name' в colors должно быть строкой",
            });
          }
          if (color.available !== undefined && typeof color.available !== "boolean") {
            errors.push({
              id: productId,
              field: `colors[${colorIndex}].available`,
              message: "Поле 'available' в colors должно быть boolean",
            });
          }
        }
      });
    }

    // Валидация элементов массива images
    if (Array.isArray(product.images)) {
      product.images.forEach((image: any, imageIndex: number) => {
        if (!image || typeof image !== "object") {
          errors.push({
            id: productId,
            field: `images[${imageIndex}]`,
            message: "Элемент массива images должен быть объектом",
          });
        } else {
          if (image.url !== undefined && typeof image.url !== "string") {
            errors.push({
              id: productId,
              field: `images[${imageIndex}].url`,
              message: "Поле 'url' в images должно быть строкой",
            });
          }
        }
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
