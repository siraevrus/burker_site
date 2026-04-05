import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/products";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  const results = await searchProducts(q);

  return NextResponse.json({
    products: results.slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      originalPriceEur: p.originalPriceEur,
      priceEur: p.priceEur,
      discount: p.discount,
      images: p.images,
      collection: p.collection,
      subcategory: p.subcategory,
      bodyId: p.bodyId,
    })),
  });
}
