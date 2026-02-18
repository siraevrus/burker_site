import { NextRequest, NextResponse } from "next/server";
import { getAllProductsForAdmin } from "@/lib/products";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const products = await getAllProductsForAdmin();
    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error fetching products for admin:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении товаров" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Необходимо указать массив ID товаров для удаления" },
        { status: 400 }
      );
    }

    const result = await prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error("Error deleting products:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при удалении товаров" },
      { status: 500 }
    );
  }
}
