import { NextResponse } from "next/server";
import { getAllProductsForAdmin } from "@/lib/products";

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
