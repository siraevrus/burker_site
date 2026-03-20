import { NextRequest, NextResponse } from "next/server";
import { getProductsByIdsForCart } from "@/lib/products";

const MAX_IDS = 80;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = body?.ids;
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
    }
    const idStrings = ids
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      .slice(0, MAX_IDS);
    const products = await getProductsByIdsForCart(idStrings);
    return NextResponse.json({ products });
  } catch (error: unknown) {
    console.error("cart-prices error:", error);
    const message = error instanceof Error ? error.message : "Ошибка при получении цен";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
