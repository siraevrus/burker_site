import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PromoBanner } from "@/lib/types";

export const runtime = 'nodejs';
export const maxDuration = 30;

function isMissingColumnError(e: unknown): boolean {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '';
  return /imageMobile|no such column|unknown column/i.test(msg);
}

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
  } catch (error: unknown) {
    if (isMissingColumnError(error)) {
      try {
        const rows = await prisma.$queryRaw<Array<{ id: string; image: string; productLink: string | null; title: string | null; subtitle: string | null; order: number }>>`
          SELECT id, image, "productLink", title, subtitle, "order" FROM "PromoBanner" ORDER BY "order" ASC
        `;
        const banners: PromoBanner[] = rows.map((row) => ({
          id: row.id,
          image: row.image,
          imageMobile: undefined,
          productLink: row.productLink ?? undefined,
          title: row.title ?? undefined,
          subtitle: row.subtitle ?? undefined,
        }));
        return NextResponse.json({ banners });
      } catch (rawError) {
        console.error("Get promo banners raw fallback error:", rawError);
      }
    }
    console.error("Get promo banners error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка при получении промоблоков" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { banners }: { banners: PromoBanner[] } = body;

  try {
    await prisma.promoBanner.deleteMany();

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
  } catch (error: unknown) {
    if (isMissingColumnError(error)) {
      try {
        await prisma.promoBanner.deleteMany();
        for (let index = 0; index < banners.length; index++) {
          const b = banners[index];
          await prisma.$executeRaw`
            INSERT INTO "PromoBanner" (id, image, "productLink", title, subtitle, "order")
            VALUES (${b.id}, ${b.image}, ${b.productLink ?? null}, ${b.title ?? null}, ${b.subtitle ?? null}, ${index})
          `;
        }
        return NextResponse.json({ success: true });
      } catch (rawError) {
        console.error("Save promo banners raw fallback error:", rawError);
      }
    }
    console.error("Save promo banners error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка при сохранении промоблоков" },
      { status: 500 }
    );
  }
}
