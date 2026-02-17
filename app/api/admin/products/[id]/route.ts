import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
