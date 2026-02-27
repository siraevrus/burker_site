import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PromoBanner } from "@/lib/types";

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  try {
    const dbBanners = await prisma.promoBanner.findMany({
      orderBy: { order: "asc" },
    });
    
    const banners: PromoBanner[] = dbBanners.map((banner) => ({
      id: banner.id,
      image: banner.image,
      imageMobile: banner.imageMobile ?? undefined,
      productLink: banner.productLink ?? undefined,
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

export async function POST(request: Request) {
  try {
    // Увеличиваем лимит размера тела запроса для больших изображений в base64
    const body = await request.json();
    const { banners }: { banners: PromoBanner[] } = body;
    
    // Удаляем все существующие баннеры
    await prisma.promoBanner.deleteMany();

    // Создаем новые баннеры
    await prisma.promoBanner.createMany({
      data: banners.map((banner, index) => ({
        id: banner.id,
        image: banner.image,
        imageMobile: banner.imageMobile ?? null,
        productLink: banner.productLink,
        title: banner.title,
        subtitle: banner.subtitle,
        order: index,
      })),
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save promo banners error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при сохранении промоблоков" },
      { status: 500 }
    );
  }
}
