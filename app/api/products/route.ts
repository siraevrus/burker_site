import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/products";

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении товаров" },
      { status: 500 }
    );
  }
}
