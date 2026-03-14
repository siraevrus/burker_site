import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface CartItemPayload {
  id: string;
  name: string;
  price: number;
  images?: string[];
  selectedColor: string;
  quantity: number;
  collection?: string;
  subcategory?: string;
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const items: CartItemPayload[] = body.items;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items must be an array" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userCartItem.deleteMany({
        where: { userId: currentUser.userId },
      });

      if (items.length > 0) {
        await tx.userCartItem.createMany({
          data: items.map((item) => ({
            userId: currentUser.userId,
            productId: item.id,
            productName: item.name,
            productPrice: item.price,
            productImage: item.images?.[0] || null,
            selectedColor: item.selectedColor,
            quantity: item.quantity,
            collection: item.collection || null,
            subcategory: item.subcategory || null,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Cart sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.userCartItem.findMany({
      where: { userId: currentUser.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Cart get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
