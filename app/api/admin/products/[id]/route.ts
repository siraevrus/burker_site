import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

function serializeSpecifications(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text) return null;

  // Разрешаем прямой JSON-ввод
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      }
    } catch {
      // Если JSON невалидный — пробуем разобрать как key: value
    }
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: Record<string, string> = {};

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key && val) {
        result[key] = val;
      }
    }
  }

  if (Object.keys(result).length > 0) {
    return JSON.stringify(result);
  }

  return JSON.stringify({ raw: text });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await request.json();
    
    // Валидация обязательных полей
    if (!body.name || !body.collection) {
      return NextResponse.json(
        { error: "Название и коллекция обязательны" },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: body.name,
      collection: body.collection,
      subcategory: body.subcategory || null,
      bestseller: body.bestseller || false,
      price: parseFloat(body.price) || 0,
      originalPrice: parseFloat(body.originalPrice) || 0,
      discount: parseInt(body.discount) || 0,
      inStock: Boolean(body.inStock),
      disabled: Boolean(body.disabled),
      description: body.description || null,
    };

    const serializedSpecifications = serializeSpecifications(body.specifications);
    if (serializedSpecifications !== undefined) {
      updateData.specifications = serializedSpecifications;
    }

    // Обновляем изображения если они переданы
    if (body.images) {
      updateData.images = JSON.stringify(body.images);
    }

    // Добавляем bodyId если он есть
    if (body.bodyId) {
      updateData.bodyId = body.bodyId;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении товара" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при удалении товара" },
      { status: 500 }
    );
  }
}
