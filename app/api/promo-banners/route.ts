import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PromoBanner } from "@/lib/types";

export async function GET() {
  try {
    const dbBanners = await prisma.promoBanner.findMany({
      orderBy: { order: "asc" },
    });
    
    const banners: PromoBanner[] = dbBanners.map((banner) => ({
      id: banner.id,
      image: banner.image,
      productLink: banner.productLink,
      title: banner.title || undefined,
      subtitle: banner.subtitle || undefined,
    }));
    
    return NextResponse.json({ banners });
  } catch (error: any) {
    console.error("Get promo banners error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при получении промоблоков" },
      { status: 500 }
    );
  }
}
